import "server-only";

import { slugify } from "@/lib/format";
import { prisma } from "@/server/db/prisma";
import { conflict, notFound } from "@/server/http/errors";
import { toCategoryDto, toDbVehicleType } from "@/server/vehicles/mapper";
import type { CategoryInput, CategoryPatch } from "@/server/categories/schemas";
import type { VehicleCategory, VehicleType } from "@/types/vehicle";

/**
 * Las categorías son taxonomía, no contenido: pocas, ordenadas a mano y
 * ligadas a un universo. Una categoría con vehículos detrás no se puede
 * borrar — se desactiva — porque perderla dejaría filas huérfanas y URLs
 * rotas.
 */

export async function listCategories(options: {
  vehicleType?: VehicleType;
  onlyActive?: boolean;
} = {}): Promise<VehicleCategory[]> {
  const records = await prisma.category.findMany({
    where: {
      ...(options.vehicleType
        ? { vehicleType: toDbVehicleType[options.vehicleType] }
        : {}),
      ...(options.onlyActive ? { active: true } : {}),
    },
    orderBy: [{ vehicleType: "asc" }, { position: "asc" }, { name: "asc" }],
  });
  return records.map(toCategoryDto);
}

/** Cuántos vehículos cuelgan de cada categoría, para la pantalla de admin. */
export async function listCategoriesWithCounts(): Promise<
  (VehicleCategory & { vehicleCount: number })[]
> {
  const records = await prisma.category.findMany({
    orderBy: [{ vehicleType: "asc" }, { position: "asc" }, { name: "asc" }],
    include: { _count: { select: { vehicles: true } } },
  });
  return records.map((record) => ({
    ...toCategoryDto(record),
    vehicleCount: record._count.vehicles,
  }));
}

export async function createCategory(
  input: CategoryInput,
): Promise<VehicleCategory> {
  const slug = slugify(input.slug || input.name);
  if (!slug) {
    throw conflict("El nombre no produce un slug válido.", {
      name: "Usa al menos una letra o un número.",
    });
  }

  const vehicleType = toDbVehicleType[input.vehicleType];
  const clash = await prisma.category.findFirst({
    where: { vehicleType, OR: [{ slug }, { name: input.name }] },
  });
  if (clash) {
    throw conflict("Ya existe una categoría con ese nombre en ese tipo.", {
      name: "Ya existe una categoría con ese nombre.",
    });
  }

  const last = await prisma.category.findFirst({
    where: { vehicleType },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const record = await prisma.category.create({
    data: {
      name: input.name,
      // Si no se indica plural, el singular sirve: "4x4" y "ADV" no cambian.
      pluralName: input.pluralName?.trim() || input.name,
      slug,
      vehicleType,
      active: input.active,
      position: input.position ?? (last ? last.position + 1 : 0),
    },
  });

  return toCategoryDto(record);
}

export async function updateCategory(
  id: string,
  patch: CategoryPatch,
): Promise<VehicleCategory> {
  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) throw notFound("Esa categoría no existe.");

  const slug = patch.slug ? slugify(patch.slug) : undefined;
  if (slug || patch.name) {
    const clash = await prisma.category.findFirst({
      where: {
        vehicleType: current.vehicleType,
        id: { not: id },
        OR: [
          ...(slug ? [{ slug }] : []),
          ...(patch.name ? [{ name: patch.name }] : []),
        ],
      },
    });
    if (clash) {
      throw conflict("Ya existe una categoría con ese nombre en ese tipo.", {
        name: "Ya existe una categoría con ese nombre.",
      });
    }
  }

  const record = await prisma.category.update({
    where: { id },
    data: {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.pluralName !== undefined
        ? { pluralName: patch.pluralName.trim() || current.name }
        : {}),
      ...(slug ? { slug } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
      ...(patch.position !== undefined ? { position: patch.position } : {}),
    },
  });

  return toCategoryDto(record);
}

export async function deleteCategory(id: string): Promise<void> {
  const count = await prisma.vehicle.count({ where: { categoryId: id } });
  if (count > 0) {
    throw conflict(
      `Esa categoría tiene ${count} vehículo${count === 1 ? "" : "s"}. ` +
        "Desactívala en vez de borrarla, o muévelos antes a otra.",
    );
  }
  try {
    await prisma.category.delete({ where: { id } });
  } catch {
    throw notFound("Esa categoría no existe.");
  }
}
