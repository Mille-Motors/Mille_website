import "server-only";

import { cache } from "react";
import { prisma } from "@/server/db/prisma";
import { notFound } from "@/server/http/errors";
import {
  SITE_MEDIA_SLOTS,
  getSlot,
  legacyImage,
  type PixelSize,
  type SiteMediaFile,
  type SiteMediaImage,
  type SiteMediaSlot,
} from "@/lib/site-media";
import {
  CENTER_FOCAL,
  normalizeFocal,
  roundFocal,
  type FocalPoint,
} from "@/lib/focal-point";
import type { SiteMediaEntry, SiteMediaVariantEntry } from "@/types/site-media";

/**
 * Las imágenes estructurales del sitio.
 *
 * Solo hay fila para los slots que alguien cambió; los demás se sirven desde
 * el registro en código. Eso hace que la home siga en pie aunque la base no
 * responda, que es lo correcto aquí: el archivo de respaldo forma parte del
 * repositorio, no es inventario inventado.
 *
 * Cada slot tiene dos caras. La de escritorio es obligatoria. La de teléfono
 * es opcional y, cuando no existe, el teléfono usa el archivo de escritorio
 * con su propio encuadre: nunca se queda sin imagen.
 */
type Row = {
  key: string;
  url: string;
  storagePath: string | null;
  source: "LEGACY" | "STORAGE";
  alt: string;
  focalX: number;
  focalY: number;
  width: number | null;
  height: number | null;
  bytes: number | null;
  contentType: string | null;
  mobileUrl: string | null;
  mobileStoragePath: string | null;
  mobileWidth: number | null;
  mobileHeight: number | null;
  mobileBytes: number | null;
  mobileContentType: string | null;
  mobileFocalX: number;
  mobileFocalY: number;
  updatedAt: Date;
};

const ROW_SELECT = {
  key: true,
  url: true,
  storagePath: true,
  source: true,
  alt: true,
  focalX: true,
  focalY: true,
  width: true,
  height: true,
  bytes: true,
  contentType: true,
  mobileUrl: true,
  mobileStoragePath: true,
  mobileWidth: true,
  mobileHeight: true,
  mobileBytes: true,
  mobileContentType: true,
  mobileFocalX: true,
  mobileFocalY: true,
  updatedAt: true,
} as const;

/**
 * Una sola consulta por render para todos los slots. La home pinta cinco, el
 * menú otras cinco y el layout la de compartir; sin memoizar serían once
 * viajes a la base para dibujar una página que no cambia entre ellos.
 */
const loadRows = cache(async (): Promise<Map<string, Row>> => {
  try {
    const rows = await prisma.siteMedia.findMany({
      where: { key: { in: SITE_MEDIA_SLOTS.map((slot) => slot.key) } },
      select: ROW_SELECT,
    });
    return new Map(rows.map((row) => [row.key, row as Row]));
  } catch (error) {
    // El sitio público no puede quedarse sin portada porque la base falle.
    // Se registra y se cae al respaldo conocido de cada slot.
    console.error("[mille:site-media] no se pudieron leer las imágenes", error);
    return new Map();
  }
});

const sizeOf = (width: number | null, height: number | null): PixelSize | null =>
  width !== null && height !== null ? { width, height } : null;

function toImage(slot: SiteMediaSlot, row: Row | undefined): SiteMediaImage {
  if (!row) return legacyImage(slot);
  // Una fila LEGACY dice "sigo apuntando al archivo original del sitio", no
  // "esta es la imagen que quiero". Si el rediseño cambió ese archivo, la
  // fila sembrada apunta a una fotografía que ya no es la del slot: manda el
  // código. Un encuadre elegido para la fotografía anterior tampoco vale para
  // la nueva, así que vuelve al centro. Si el archivo sigue siendo el mismo,
  // la fila se respeta entera, encuadre incluido.
  if (row.source === "LEGACY" && row.url !== slot.legacySrc) {
    return legacyImage(slot);
  }

  const desktop: SiteMediaFile = {
    src: row.url,
    source: row.source === "LEGACY" ? "legacy" : "storage",
    // Se normaliza aunque la columna tenga CHECK: la fila podría venir de una
    // base sin la migración, y un encuadre ilegible no debe dejar la home en
    // blanco. Al centro, que es como se veía antes.
    focal: normalizeFocal({ x: row.focalX, y: row.focalY }),
    size: sizeOf(row.width, row.height),
    bytes: row.bytes,
    contentType: row.contentType,
  };

  const mobileFocal = normalizeFocal({ x: row.mobileFocalX, y: row.mobileFocalY });

  return {
    alt: row.alt,
    desktop,
    mobile: row.mobileUrl
      ? {
          src: row.mobileUrl,
          // Una variante de teléfono solo puede existir si se subió.
          source: "storage",
          focal: mobileFocal,
          size: sizeOf(row.mobileWidth, row.mobileHeight),
          bytes: row.mobileBytes,
          contentType: row.mobileContentType,
        }
      : null,
    mobileFocal,
  };
}

/** Lo que usa el frontend público para pintar un slot. */
export async function getSiteMediaImage(key: string): Promise<SiteMediaImage> {
  const slot = getSlot(key);
  if (!slot) {
    throw new Error(`Slot de imagen desconocido: ${key}`);
  }
  const rows = await loadRows();
  return toImage(slot, rows.get(key));
}

const toVariantEntry = (file: SiteMediaFile): SiteMediaVariantEntry => ({
  src: file.src,
  source: file.source,
  focal: file.focal,
  size: file.size,
  bytes: file.bytes,
  contentType: file.contentType,
});

/** Todos los slots con su estado actual, para /admin/contenido. */
export async function listSiteMedia(): Promise<SiteMediaEntry[]> {
  const rows = await loadRows();
  return SITE_MEDIA_SLOTS.map((slot) => {
    const row = rows.get(slot.key);
    const image = toImage(slot, row);
    return {
      key: slot.key,
      label: slot.label,
      description: slot.description,
      aspect: slot.aspect,
      frames: slot.frames,
      mobileVariantRecommended: slot.mobileVariantRecommended,
      decorative: slot.decorative ?? false,
      alt: image.alt,
      desktop: toVariantEntry(image.desktop),
      mobile: image.mobile ? toVariantEntry(image.mobile) : null,
      mobileFocal: image.mobileFocal,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    };
  });
}

export async function requireSlot(key: string): Promise<SiteMediaSlot> {
  const slot = getSlot(key);
  if (!slot) throw notFound("Ese slot no existe.");
  return slot;
}

/** La fila actual de un slot, si alguien ya lo cambió. */
export async function getSiteMediaRow(key: string) {
  return prisma.siteMedia.findUnique({ where: { key } });
}

/** Lo que se sabe de un archivo recién subido. */
export interface UploadedFacts {
  url: string;
  storagePath: string;
  bytes: number;
  contentType: string;
  size: PixelSize | null;
}

/**
 * Apunta la variante de ESCRITORIO de un slot a una imagen nueva.
 *
 * Devuelve la ruta de Storage que quedó huérfana, si la había, para que quien
 * llama la borre del bucket *después* de que la base ya apunte a la nueva. Si
 * se borrara antes y fallara la escritura, el sitio quedaría apuntando a un
 * archivo inexistente.
 *
 * No toca la variante de teléfono: son dos fotografías distintas y cambiar
 * una no puede llevarse la otra por delante.
 */
export async function setSiteMediaImage(
  key: string,
  image: UploadedFacts & {
    alt: string;
    /**
     * El encuadre elegido para *esta* fotografía. Se escribe siempre, y por
     * defecto va centrado: el encuadre de la imagen anterior describía otra
     * fotografía y heredarlo dejaría a la nueva recortada por un motivo que
     * ya no existe.
     */
    focal: FocalPoint;
  },
): Promise<{ previousStoragePath: string | null }> {
  const previous = await prisma.siteMedia.findUnique({
    where: { key },
    select: { storagePath: true, source: true },
  });

  const focal = roundFocal(normalizeFocal(image.focal));
  const data = {
    url: image.url,
    storagePath: image.storagePath,
    source: "STORAGE" as const,
    alt: image.alt,
    focalX: focal.x,
    focalY: focal.y,
    width: image.size?.width ?? null,
    height: image.size?.height ?? null,
    bytes: image.bytes,
    contentType: image.contentType,
  };

  await prisma.siteMedia.upsert({
    where: { key },
    create: { key, ...data },
    update: data,
  });

  return {
    // Solo se puede borrar lo que subimos nosotros. Las imágenes heredadas
    // viven en /public y son parte del repositorio.
    previousStoragePath:
      previous?.source === "STORAGE" ? previous.storagePath : null,
  };
}

/**
 * Sube o reemplaza la variante de TELÉFONO.
 *
 * Si el slot todavía no tenía fila se materializa conservando la fotografía
 * heredada como escritorio: añadir una composición vertical no puede
 * significar perder la que ya se veía.
 */
export async function setSiteMediaMobileImage(
  key: string,
  image: UploadedFacts & { focal: FocalPoint },
): Promise<{ previousStoragePath: string | null }> {
  const slot = await requireSlot(key);
  const previous = await prisma.siteMedia.findUnique({
    where: { key },
    select: { mobileStoragePath: true },
  });

  const focal = roundFocal(normalizeFocal(image.focal));
  const data = {
    mobileUrl: image.url,
    mobileStoragePath: image.storagePath,
    mobileWidth: image.size?.width ?? null,
    mobileHeight: image.size?.height ?? null,
    mobileBytes: image.bytes,
    mobileContentType: image.contentType,
    mobileFocalX: focal.x,
    mobileFocalY: focal.y,
  };

  await prisma.siteMedia.upsert({
    where: { key },
    create: {
      key,
      url: slot.legacySrc,
      storagePath: null,
      source: "LEGACY",
      alt: slot.legacyAlt,
      ...data,
    },
    update: data,
  });

  return { previousStoragePath: previous?.mobileStoragePath ?? null };
}

/**
 * Quita la variante de teléfono.
 *
 * El slot vuelve solo al respaldo: la fotografía de escritorio con el
 * encuadre de teléfono, que es exactamente lo que había antes de subirla. El
 * encuadre NO se borra — describe cómo se ve en vertical y sigue sirviendo.
 */
export async function clearSiteMediaMobileImage(
  key: string,
): Promise<{ previousStoragePath: string | null }> {
  const existing = await prisma.siteMedia.findUnique({
    where: { key },
    select: { mobileStoragePath: true, mobileUrl: true },
  });
  if (!existing?.mobileUrl) return { previousStoragePath: null };

  await prisma.siteMedia.update({
    where: { key },
    data: {
      mobileUrl: null,
      mobileStoragePath: null,
      mobileWidth: null,
      mobileHeight: null,
      mobileBytes: null,
      mobileContentType: null,
    },
  });

  return { previousStoragePath: existing.mobileStoragePath };
}

/** Materializa la fila de un slot que sigue con su fotografía original. */
async function materialize(slot: SiteMediaSlot, alt?: string) {
  return prisma.siteMedia.create({
    data: {
      key: slot.key,
      url: slot.legacySrc,
      storagePath: null,
      source: "LEGACY",
      alt: alt ?? slot.legacyAlt,
    },
  });
}

/** Cambia solo el texto alternativo, sin tocar el archivo. */
export async function setSiteMediaAlt(key: string, alt: string): Promise<void> {
  const slot = await requireSlot(key);
  const existing = await prisma.siteMedia.findUnique({ where: { key } });

  if (existing) {
    await prisma.siteMedia.update({ where: { key }, data: { alt } });
    return;
  }

  // El slot sigue con su imagen original y solo se está corrigiendo el texto:
  // se materializa la fila conservando la imagen heredada.
  await materialize(slot, alt);
}

/**
 * Cambia solo el encuadre, sin tocar el archivo.
 *
 * Es la operación barata de esta pantalla: no sube nada, no borra nada y no
 * cambia la URL de Storage. Si el slot sigue con su fotografía original se
 * materializa la fila conservándola —igual que al corregir el texto
 * alternativo—, porque encuadrar la imagen heredada es tan legítimo como
 * encuadrar una subida.
 *
 * `variant` decide cuál de los dos encuadres se guarda. El de teléfono se
 * puede ajustar aunque no haya variante propia: entonces describe cómo se
 * recorta en vertical la fotografía de escritorio, que es el caso más común.
 */
export async function setSiteMediaFocal(
  key: string,
  focal: FocalPoint,
  variant: "desktop" | "mobile" = "desktop",
): Promise<void> {
  const slot = await requireSlot(key);
  const value = roundFocal(normalizeFocal(focal));
  const data =
    variant === "mobile"
      ? { mobileFocalX: value.x, mobileFocalY: value.y }
      : { focalX: value.x, focalY: value.y };

  const existing = await prisma.siteMedia.findUnique({ where: { key } });
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

/**
 * Devuelve un slot a la fotografía con la que se construyó el sitio.
 * Es lo que permite deshacer una prueba sin dejar rastro.
 */
export async function resetSiteMedia(
  key: string,
): Promise<{ previousStoragePaths: string[] }> {
  const slot = await requireSlot(key);
  const existing = await prisma.siteMedia.findUnique({ where: { key } });
  if (!existing) return { previousStoragePaths: [] };

  await prisma.siteMedia.update({
    where: { key },
    data: {
      url: slot.legacySrc,
      storagePath: null,
      source: "LEGACY",
      alt: slot.legacyAlt,
      // Restaurar es volver al punto de partida entero: la fotografía
      // original centrada, que es como el sitio se construyó. Conservar el
      // encuadre de la imagen que se acaba de descartar no describiría a
      // esta.
      focalX: CENTER_FOCAL.x,
      focalY: CENTER_FOCAL.y,
      width: null,
      height: null,
      bytes: null,
      contentType: null,
      // Y también la variante de teléfono: restaurar deja el slot como
      // estaba, no a medias.
      mobileUrl: null,
      mobileStoragePath: null,
      mobileWidth: null,
      mobileHeight: null,
      mobileBytes: null,
      mobileContentType: null,
      mobileFocalX: CENTER_FOCAL.x,
      mobileFocalY: CENTER_FOCAL.y,
    },
  });

  return {
    previousStoragePaths: [
      existing.source === "STORAGE" ? existing.storagePath : null,
      existing.mobileStoragePath,
    ].filter((path): path is string => path !== null),
  };
}
