import "server-only";

import type { ImageSourceType as DbImageSourceType } from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";
import { notFound } from "@/server/http/errors";
import { SITE_MEDIA_SLOTS, getSlot } from "@/lib/site-media";
import {
  imageRightsFromColumns,
  resolveImageRights,
  type ImageSourceType,
} from "@/lib/image-provenance";
import type { ImageRightsInput } from "@/server/provenance/schemas";
import type {
  SiteMediaProvenance,
  VehicleProvenance,
} from "@/types/provenance";

/**
 * De dónde salió cada fotografía del sitio.
 *
 * Responde una sola pregunta —«¿por qué podemos usar esta foto?»— y la
 * responde solo en el Admin. El sitio público no lee nada de aquí: la
 * procedencia es trazabilidad, no un crédito al pie de la imagen.
 *
 * Nada de esto bloquea nada. Una fotografía sin procedencia registrada queda
 * pendiente y sigue publicándose igual: las fotos que ya estaban no reciben
 * una autorización inventada por el hecho de existir, y tampoco se
 * despublican por no tenerla.
 */

const toDbSourceType: Record<ImageSourceType, DbImageSourceType> = {
  own: "OWN",
  owner: "OWNER",
  dealer: "DEALER",
  photographer: "PHOTOGRAPHER",
  stock: "STOCK",
  manufacturer: "MANUFACTURER",
  other: "OTHER",
};

/** Las once columnas de procedencia. Se piden y se escriben siempre juntas. */
const RIGHTS_SELECT = {
  rightsSourceType: true,
  rightsSourceName: true,
  rightsAuthor: true,
  rightsSourceUrl: true,
  rightsLicenseType: true,
  rightsLicenseUrl: true,
  rightsLicenseRequiresAttribution: true,
  rightsAcquiredOn: true,
  rightsAuthorizedBy: true,
  rightsProofRef: true,
  rightsNotes: true,
} as const;

/**
 * Los valores a escribir. `null` vacía TODAS las columnas a la vez.
 *
 * Es importante que se escriban juntas: dejar el autor de un registro
 * anterior junto al tipo de fuente de uno nuevo produciría una procedencia
 * que no describe a nadie. Un bloque entra entero o se va entero.
 */
function rightsData(rights: ImageRightsInput | null) {
  if (!rights) {
    return {
      rightsSourceType: null,
      rightsSourceName: null,
      rightsAuthor: null,
      rightsSourceUrl: null,
      rightsLicenseType: null,
      rightsLicenseUrl: null,
      rightsLicenseRequiresAttribution: false,
      rightsAcquiredOn: null,
      rightsAuthorizedBy: null,
      rightsProofRef: null,
      rightsNotes: null,
    };
  }
  return {
    rightsSourceType: toDbSourceType[rights.sourceType],
    rightsSourceName: rights.sourceName ?? null,
    rightsAuthor: rights.author ?? null,
    rightsSourceUrl: rights.sourceUrl ?? null,
    rightsLicenseType: rights.licenseType ?? null,
    rightsLicenseUrl: rights.licenseUrl ?? null,
    rightsLicenseRequiresAttribution: rights.licenseRequiresAttribution,
    // Medianoche UTC: la columna es DATE y es un día del calendario, no un
    // instante. Construirla en hora local la correría un día en Bogotá.
    rightsAcquiredOn: rights.acquiredOn
      ? new Date(`${rights.acquiredOn}T00:00:00.000Z`)
      : null,
    rightsAuthorizedBy: rights.authorizedBy ?? null,
    rightsProofRef: rights.proofRef ?? null,
    rightsNotes: rights.notes ?? null,
  };
}

// ---------------------------------------------------------------------------
// Vehículos
// ---------------------------------------------------------------------------

/** El lote y todas sus fotografías, con la procedencia ya resuelta. */
export async function getVehicleProvenance(
  vehicleId: string,
): Promise<VehicleProvenance> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: {
      id: true,
      ...RIGHTS_SELECT,
      images: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          url: true,
          alt: true,
          position: true,
          source: true,
          ...RIGHTS_SELECT,
        },
      },
    },
  });
  if (!vehicle) throw notFound("Ese vehículo no existe.");

  const lot = imageRightsFromColumns(vehicle);

  const images = vehicle.images.map((image) => {
    const own = imageRightsFromColumns(image);
    return {
      imageId: image.id,
      src: image.url,
      alt: image.alt,
      position: image.position,
      source: image.source === "LEGACY" ? ("legacy" as const) : ("storage" as const),
      own,
      // El orden manda: la foto, el lote, y por último los créditos del
      // repositorio para los archivos que viven en /public.
      resolved: resolveImageRights({ image: own, vehicle: lot, src: image.url }),
    };
  });

  return {
    vehicleId: vehicle.id,
    lot,
    images,
    pendingCount: images.filter((image) => image.resolved.status === "pending")
      .length,
  };
}

/** La procedencia del LOTE: cómo llegaron las fotos de este vehículo. */
export async function setVehicleRights(
  vehicleId: string,
  rights: ImageRightsInput | null,
): Promise<VehicleProvenance> {
  const exists = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true },
  });
  if (!exists) throw notFound("Ese vehículo no existe.");

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: rightsData(rights),
  });

  return getVehicleProvenance(vehicleId);
}

/**
 * La procedencia de UNA fotografía, cuando no es la del lote.
 *
 * Por identificador Y vehículo, igual que el encuadre y el borrado: una foto
 * de otra ficha simplemente no aparece, así que no se puede modificar desde
 * la pantalla de este vehículo ni por accidente ni a propósito.
 */
export async function setVehicleImageRights(
  vehicleId: string,
  imageId: string,
  rights: ImageRightsInput | null,
): Promise<VehicleProvenance> {
  const image = await prisma.vehicleImage.findFirst({
    where: { id: imageId, vehicleId },
    select: { id: true },
  });
  if (!image) throw notFound("Esa imagen no existe.");

  await prisma.vehicleImage.update({
    where: { id: image.id },
    data: rightsData(rights),
  });

  return getVehicleProvenance(vehicleId);
}

/** Cuántas fotografías del inventario siguen sin procedencia registrada. */
export async function countPendingVehicleProvenance(): Promise<number> {
  // Pendiente = ni la foto ni su vehículo la tienen registrada Y el archivo
  // no es uno del repositorio. Lo último no se puede preguntar en SQL —los
  // créditos del repositorio viven en código—, así que se cuentan las
  // candidatas y se descartan aquí.
  const rows = await prisma.vehicleImage.findMany({
    where: {
      rightsSourceType: null,
      vehicle: { rightsSourceType: null },
    },
    select: { url: true },
  });
  return rows.filter(
    (row) => resolveImageRights({ src: row.url }).status === "pending",
  ).length;
}

// ---------------------------------------------------------------------------
// Imágenes estructurales del sitio
// ---------------------------------------------------------------------------

/**
 * Los espacios del sitio con su procedencia.
 *
 * Un espacio que sigue mostrando el archivo del repositorio no necesita fila:
 * su procedencia está en `REPOSITORY_IMAGE_RIGHTS`, generada de los
 * CREDITS.json. Solo lo que alguien subió necesita que se lo cuenten.
 */
export async function listSiteMediaProvenance(): Promise<SiteMediaProvenance[]> {
  const rows = await prisma.siteMedia.findMany({
    where: { key: { in: SITE_MEDIA_SLOTS.map((slot) => slot.key) } },
    select: { key: true, url: true, source: true, ...RIGHTS_SELECT },
  });
  const byKey = new Map(rows.map((row) => [row.key, row]));

  return SITE_MEDIA_SLOTS.map((slot) => {
    const row = byKey.get(slot.key);
    const own = row ? imageRightsFromColumns(row) : null;
    // Sin fila, o con una fila que sigue apuntando a /public, el archivo que
    // se ve es el del repositorio y su procedencia es la del repositorio.
    const usesRepositoryFile = !row || row.source === "LEGACY";
    return {
      key: slot.key,
      label: slot.label,
      own,
      resolved: resolveImageRights({
        image: own,
        src: usesRepositoryFile ? (row?.url ?? slot.legacySrc) : row.url,
      }),
      usesRepositoryFile,
    };
  });
}

/**
 * La procedencia de un espacio del sitio.
 *
 * Si el espacio todavía no tenía fila se materializa conservando la
 * fotografía heredada, igual que al corregir el texto alternativo o el
 * encuadre: registrar de dónde salió una fotografía no puede cambiar qué
 * fotografía se ve.
 */
export async function setSiteMediaRights(
  key: string,
  rights: ImageRightsInput | null,
): Promise<void> {
  const slot = getSlot(key);
  if (!slot) throw notFound("Ese slot no existe.");

  const data = rightsData(rights);
  const existing = await prisma.siteMedia.findUnique({
    where: { key },
    select: { key: true },
  });

  if (existing) {
    await prisma.siteMedia.update({ where: { key }, data });
    return;
  }

  await prisma.siteMedia.create({
    data: {
      key,
      url: slot.legacySrc,
      storagePath: null,
      source: "LEGACY",
      alt: slot.legacyAlt,
      ...data,
    },
  });
}
