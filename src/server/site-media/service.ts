import "server-only";

import { cache } from "react";
import { prisma } from "@/server/db/prisma";
import { notFound } from "@/server/http/errors";
import {
  SITE_MEDIA_SLOTS,
  getSlot,
  legacyImage,
  type SiteMediaImage,
  type SiteMediaSlot,
} from "@/lib/site-media";
import {
  CENTER_FOCAL,
  normalizeFocal,
  roundFocal,
  type FocalPoint,
} from "@/lib/focal-point";
import type { SiteMediaEntry } from "@/types/site-media";

/**
 * Las imágenes estructurales del sitio.
 *
 * Solo hay fila para los slots que alguien cambió; los demás se sirven desde
 * el registro en código. Eso hace que la home siga en pie aunque la base no
 * responda, que es lo correcto aquí: el archivo de respaldo forma parte del
 * repositorio, no es inventario inventado.
 */
type Row = {
  key: string;
  url: string;
  storagePath: string | null;
  source: "LEGACY" | "STORAGE";
  alt: string;
  focalX: number;
  focalY: number;
  updatedAt: Date;
};

/**
 * Una sola consulta por petición para los cuatro slots. La home pinta tres y
 * el hero uno; sin memoizar serían cuatro viajes a la base para dibujar una
 * página que no cambia entre ellos.
 */
const loadRows = cache(async (): Promise<Map<string, Row>> => {
  try {
    const rows = await prisma.siteMedia.findMany({
      where: { key: { in: SITE_MEDIA_SLOTS.map((slot) => slot.key) } },
      select: {
        key: true,
        url: true,
        storagePath: true,
        source: true,
        alt: true,
        focalX: true,
        focalY: true,
        updatedAt: true,
      },
    });
    return new Map(rows.map((row) => [row.key, row as Row]));
  } catch (error) {
    // El sitio público no puede quedarse sin portada porque la base falle.
    // Se registra y se cae al respaldo conocido de cada slot.
    console.error("[mille:site-media] no se pudieron leer las imágenes", error);
    return new Map();
  }
});

function toImage(slot: SiteMediaSlot, row: Row | undefined): SiteMediaImage {
  if (!row) return legacyImage(slot);
  return {
    src: row.url,
    alt: row.alt,
    source: row.source === "LEGACY" ? "legacy" : "storage",
    // Se normaliza aunque la columna tenga CHECK: la fila podría venir de una
    // base sin la migración, y un encuadre ilegible no debe dejar la home en
    // blanco. Al centro, que es como se veía antes.
    focal: normalizeFocal({ x: row.focalX, y: row.focalY }),
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
      src: image.src,
      alt: image.alt,
      source: image.source,
      focal: image.focal,
      storagePath: row?.storagePath ?? null,
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

/**
 * Apunta un slot a una imagen nueva.
 *
 * Devuelve la ruta de Storage que quedó huérfana, si la había, para que quien
 * llama la borre del bucket *después* de que la base ya apunte a la nueva. Si
 * se borrara antes y fallara la escritura, el sitio quedaría apuntando a un
 * archivo inexistente.
 */
export async function setSiteMediaImage(
  key: string,
  image: {
    url: string;
    storagePath: string;
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

  await prisma.siteMedia.upsert({
    where: { key },
    create: {
      key,
      url: image.url,
      storagePath: image.storagePath,
      source: "STORAGE",
      alt: image.alt,
      focalX: focal.x,
      focalY: focal.y,
    },
    update: {
      url: image.url,
      storagePath: image.storagePath,
      source: "STORAGE",
      alt: image.alt,
      focalX: focal.x,
      focalY: focal.y,
    },
  });

  return {
    // Solo se puede borrar lo que subimos nosotros. Las imágenes heredadas
    // viven en /public y son parte del repositorio.
    previousStoragePath:
      previous?.source === "STORAGE" ? previous.storagePath : null,
  };
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
  await prisma.siteMedia.create({
    data: {
      key,
      url: slot.legacySrc,
      storagePath: null,
      source: "LEGACY",
      alt,
    },
  });
}

/**
 * Cambia solo el encuadre, sin tocar el archivo.
 *
 * Es la operación barata de esta pantalla: no sube nada, no borra nada y no
 * cambia la URL de Storage. Si el slot sigue con su fotografía original se
 * materializa la fila conservándola —igual que al corregir el texto
 * alternativo—, porque encuadrar la imagen heredada es tan legítimo como
 * encuadrar una subida.
 */
export async function setSiteMediaFocal(
  key: string,
  focal: FocalPoint,
): Promise<void> {
  const slot = await requireSlot(key);
  const value = roundFocal(normalizeFocal(focal));
  const existing = await prisma.siteMedia.findUnique({ where: { key } });

  if (existing) {
    await prisma.siteMedia.update({
      where: { key },
      data: { focalX: value.x, focalY: value.y },
    });
    return;
  }

  await prisma.siteMedia.create({
    data: {
      key,
      url: slot.legacySrc,
      storagePath: null,
      source: "LEGACY",
      alt: slot.legacyAlt,
      focalX: value.x,
      focalY: value.y,
    },
  });
}

/**
 * Devuelve un slot a la fotografía con la que se construyó el sitio.
 * Es lo que permite deshacer una prueba sin dejar rastro.
 */
export async function resetSiteMedia(
  key: string,
): Promise<{ previousStoragePath: string | null }> {
  const slot = await requireSlot(key);
  const existing = await prisma.siteMedia.findUnique({ where: { key } });
  if (!existing) return { previousStoragePath: null };

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
    },
  });

  return {
    previousStoragePath:
      existing.source === "STORAGE" ? existing.storagePath : null,
  };
}
