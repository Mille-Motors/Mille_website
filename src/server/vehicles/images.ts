import "server-only";

import { prisma } from "@/server/db/prisma";
import { conflict, notFound } from "@/server/http/errors";
import { vehicleTitle } from "@/lib/format";
import {
  MAX_IMAGES_PER_VEHICLE,
  deleteStoredImage,
  uploadVehicleImage,
} from "@/server/storage/images";
import { toVehicleDto, vehicleInclude, type VehicleRecord } from "@/server/vehicles/mapper";
import type { Vehicle } from "@/types/vehicle";

/**
 * Las imágenes de un vehículo: subir, ordenar y borrar.
 *
 * `position` es el orden de la galería y la 0 es la portada. La columna
 * tiene un índice único (vehicleId, position), así que reordenar se hace en
 * una transacción y en dos pasos: primero se apartan a posiciones negativas
 * y luego se asignan las definitivas. Sin eso, mover la tercera a la primera
 * chocaría contra la fila que todavía ocupa ese hueco.
 */

async function reloadVehicle(vehicleId: string): Promise<Vehicle> {
  const record = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: vehicleInclude,
  });
  if (!record) throw notFound("Ese vehículo no existe.");
  return toVehicleDto(record as VehicleRecord);
}

export async function addVehicleImages(
  vehicleId: string,
  files: File[],
): Promise<Vehicle> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: {
      id: true,
      make: true,
      model: true,
      version: true,
      _count: { select: { images: true } },
    },
  });
  if (!vehicle) throw notFound("Ese vehículo no existe.");

  const existing = vehicle._count.images;
  if (existing + files.length > MAX_IMAGES_PER_VEHICLE) {
    throw conflict(
      `Un vehículo admite hasta ${MAX_IMAGES_PER_VEHICLE} imágenes; ya tiene ${existing}.`,
    );
  }

  const last = await prisma.vehicleImage.findFirst({
    where: { vehicleId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  let position = last ? last.position + 1 : 0;

  const title = vehicleTitle(vehicle);
  const uploaded: { storagePath: string }[] = [];

  try {
    for (const file of files) {
      const result = await uploadVehicleImage(vehicleId, file);
      uploaded.push({ storagePath: result.storagePath });
      await prisma.vehicleImage.create({
        data: {
          vehicleId,
          url: result.url,
          storagePath: result.storagePath,
          source: "STORAGE",
          alt: `${title}, fotografía ${position + 1}`,
          position,
        },
      });
      position += 1;
    }
  } catch (error) {
    // Si una fila falla después de subir su archivo, el objeto quedaría en
    // el bucket sin nada que lo referencie. Se limpia lo de esta tanda.
    const orphans = uploaded.slice(-1);
    for (const orphan of orphans) {
      const linked = await prisma.vehicleImage.findFirst({
        where: { storagePath: orphan.storagePath },
        select: { id: true },
      });
      if (!linked) await deleteStoredImage(orphan.storagePath);
    }
    throw error;
  }

  return reloadVehicle(vehicleId);
}

export async function deleteVehicleImage(
  vehicleId: string,
  imageId: string,
): Promise<Vehicle> {
  const image = await prisma.vehicleImage.findFirst({
    where: { id: imageId, vehicleId },
  });
  if (!image) throw notFound("Esa imagen no existe.");

  // La fila se va siempre; el objeto del bucket solo si es nuestro. Las
  // imágenes LEGACY viven en /public y no se tocan desde aquí.
  await prisma.vehicleImage.delete({ where: { id: imageId } });
  if (image.source === "STORAGE" && image.storagePath) {
    await deleteStoredImage(image.storagePath);
  }

  // Cerrar el hueco para que las posiciones sigan siendo 0..n-1.
  const rest = await prisma.vehicleImage.findMany({
    where: { vehicleId },
    orderBy: { position: "asc" },
    select: { id: true },
  });
  await prisma.$transaction([
    ...rest.map((row, index) =>
      prisma.vehicleImage.update({
        where: { id: row.id },
        data: { position: -(index + 1) },
      }),
    ),
    ...rest.map((row, index) =>
      prisma.vehicleImage.update({
        where: { id: row.id },
        data: { position: index },
      }),
    ),
  ]);

  return reloadVehicle(vehicleId);
}

export async function reorderVehicleImages(
  vehicleId: string,
  order: { id: string; position: number; alt?: string }[],
): Promise<Vehicle> {
  const existing = await prisma.vehicleImage.findMany({
    where: { vehicleId },
    select: { id: true },
  });
  const known = new Set(existing.map((row) => row.id));
  for (const entry of order) {
    if (!known.has(entry.id)) {
      throw notFound("Una de las imágenes no pertenece a este vehículo.");
    }
  }

  const normalised = [...order]
    .sort((a, b) => a.position - b.position)
    .map((entry, index) => ({ ...entry, position: index }));

  await prisma.$transaction([
    // Paso de aparcamiento: posiciones negativas que nadie más ocupa, para
    // no chocar contra el índice único mientras se recolocan.
    ...normalised.map((entry, index) =>
      prisma.vehicleImage.update({
        where: { id: entry.id },
        data: { position: -(index + 1) },
      }),
    ),
    ...normalised.map((entry) =>
      prisma.vehicleImage.update({
        where: { id: entry.id },
        data: {
          position: entry.position,
          ...(entry.alt !== undefined ? { alt: entry.alt } : {}),
        },
      }),
    ),
  ]);

  return reloadVehicle(vehicleId);
}
