import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { conflict, notFound } from "@/server/http/errors";
import { publicationBlockers } from "@/lib/publication";
import { uniqueVehicleSlug } from "@/server/vehicles/slug";
import {
  toDbAvailability,
  toDbPublication,
  toDbVehicleType,
  toVehicleDto,
  vehicleInclude,
  type VehicleRecord,
} from "@/server/vehicles/mapper";
import type {
  AdminVehicleQuery,
  VehicleInput,
  VehiclePatch,
} from "@/server/vehicles/schemas";
import type {
  AvailabilityStatus,
  PublicationStatus,
  Vehicle,
  VehicleType,
} from "@/types/vehicle";

/**
 * Toda la lógica de negocio del inventario.
 *
 * Los route handlers y las páginas llaman aquí; aquí es donde se decide qué
 * es visible, qué requisitos tiene publicar y cómo se resuelven los slugs.
 * Nadie construye consultas de Prisma fuera de este archivo.
 */

// ---------------------------------------------------------------------------
// Consultas públicas
// ---------------------------------------------------------------------------

export interface PublicVehicleQuery {
  vehicleType?: VehicleType;
  categorySlug?: string;
  make?: string;
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  sort?: "recent" | "price-asc" | "price-desc" | "mileage-asc" | "year-desc";
  limit?: number;
}

/**
 * El sitio público solo puede ver lo publicado. No es un filtro por defecto
 * que una opción pueda desactivar: es la única cláusula que estas funciones
 * saben escribir.
 */
const PUBLISHED = { publicationStatus: "PUBLISHED" } as const;

function orderFor(
  sort: PublicVehicleQuery["sort"],
): Prisma.VehicleOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return [{ price: "asc" }];
    case "price-desc":
      return [{ price: "desc" }];
    case "mileage-asc":
      return [{ mileage: "asc" }];
    case "year-desc":
      return [{ year: "desc" }];
    default:
      // "Más recientes" significa desde cuándo está a la venta, no cuándo se
      // tocó por última vez: editar una descripción no debe reordenar la rejilla.
      return [{ createdAt: "desc" }];
  }
}

function publicWhere(query: PublicVehicleQuery): Prisma.VehicleWhereInput {
  const where: Prisma.VehicleWhereInput = { ...PUBLISHED };

  if (query.vehicleType) where.vehicleType = toDbVehicleType[query.vehicleType];
  if (query.categorySlug) {
    where.category = { slug: query.categorySlug };
  }
  if (query.make) where.make = query.make;
  if (query.featured !== undefined) where.featured = query.featured;

  if (query.minYear !== undefined || query.maxYear !== undefined) {
    where.year = {
      ...(query.minYear !== undefined ? { gte: query.minYear } : {}),
      ...(query.maxYear !== undefined ? { lte: query.maxYear } : {}),
    };
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {
      ...(query.minPrice !== undefined ? { gte: BigInt(query.minPrice) } : {}),
      ...(query.maxPrice !== undefined ? { lte: BigInt(query.maxPrice) } : {}),
    };
  }

  return where;
}

/** Inventario visible, filtrado y ordenado en la base, no en el navegador. */
export async function listPublicVehicles(
  query: PublicVehicleQuery = {},
): Promise<Vehicle[]> {
  const records = await prisma.vehicle.findMany({
    where: publicWhere(query),
    include: vehicleInclude,
    orderBy: orderFor(query.sort),
    take: query.limit,
  });
  return records.map((record) => toVehicleDto(record as VehicleRecord));
}

export async function getPublicVehicleBySlug(
  slug: string,
): Promise<Vehicle | null> {
  const record = await prisma.vehicle.findFirst({
    where: { slug, ...PUBLISHED },
    include: vehicleInclude,
  });
  return record ? toVehicleDto(record as VehicleRecord) : null;
}

export async function listPublicVehicleSlugs(): Promise<string[]> {
  const rows = await prisma.vehicle.findMany({
    where: PUBLISHED,
    select: { slug: true },
  });
  return rows.map((row) => row.slug);
}

/**
 * Destacados para la home. Si no hay suficientes marcados, completa con el
 * stock disponible más reciente: la portada nunca debe verse a medias.
 */
export async function listFeaturedVehicles(limit = 4): Promise<Vehicle[]> {
  const featured = await listPublicVehicles({ featured: true, sort: "recent" });
  if (featured.length >= limit) return featured.slice(0, limit);

  const fill = await prisma.vehicle.findMany({
    where: {
      ...PUBLISHED,
      featured: false,
      availabilityStatus: "AVAILABLE",
      id: { notIn: featured.map((v) => v.id) },
    },
    include: vehicleInclude,
    orderBy: [{ createdAt: "desc" }],
    take: limit - featured.length,
  });

  return [
    ...featured,
    ...fill.map((record) => toVehicleDto(record as VehicleRecord)),
  ];
}

/**
 * Vehículos relacionados: mismo universo, y se prefiere misma categoría,
 * misma marca y precio cercano. El orden se decide en memoria porque son
 * como mucho unas decenas de filas y la afinidad no es expresable en SQL
 * sin complicarlo mucho más de lo que vale.
 */
export async function listRelatedVehicles(
  vehicle: Vehicle,
  limit = 3,
): Promise<Vehicle[]> {
  const records = await prisma.vehicle.findMany({
    where: {
      ...PUBLISHED,
      vehicleType: toDbVehicleType[vehicle.vehicleType],
      id: { not: vehicle.id },
    },
    include: vehicleInclude,
    take: 40,
    orderBy: [{ createdAt: "desc" }],
  });

  const pool = records.map((record) => toVehicleDto(record as VehicleRecord));
  const score = (candidate: Vehicle) => {
    let value = 0;
    if (candidate.category.id === vehicle.category.id) value += 2;
    if (candidate.make === vehicle.make) value += 1;
    const gap = Math.abs(candidate.price - vehicle.price) / (vehicle.price || 1);
    if (gap < 0.35) value += 1;
    return value;
  };

  return [...pool].sort((a, b) => score(b) - score(a)).slice(0, limit);
}

export interface InventoryFacets {
  makes: string[];
  /** Descendente, para ofrecer primero el año más nuevo. */
  years: number[];
  minYear: number;
  maxYear: number;
  categories: { id: string; name: string; pluralName: string; slug: string }[];
  minPrice: number;
  maxPrice: number;
  counts: { auto: number; moto: number; all: number };
}

/**
 * Las opciones de los filtros salen del inventario realmente visible, no de
 * una lista fija. Al pasar un tipo se acotan a ese universo: quien navega
 * motos no debería ver una marca que solo existe entre los carros.
 */
export async function getInventoryFacets(
  type: VehicleType | "all" = "all",
): Promise<InventoryFacets> {
  const scopeWhere: Prisma.VehicleWhereInput =
    type === "all"
      ? { ...PUBLISHED }
      : { ...PUBLISHED, vehicleType: toDbVehicleType[type] };

  const [scoped, counts] = await Promise.all([
    prisma.vehicle.findMany({
      where: scopeWhere,
      select: {
        make: true,
        year: true,
        price: true,
        category: {
          select: { id: true, name: true, pluralName: true, slug: true, position: true },
        },
      },
    }),
    prisma.vehicle.groupBy({
      by: ["vehicleType"],
      where: PUBLISHED,
      _count: { _all: true },
    }),
  ]);

  // Un universo vacío no debe producir Infinity ni una lista imposible de
  // usar: se cae al inventario completo para los límites.
  const pool =
    scoped.length > 0
      ? scoped
      : await prisma.vehicle.findMany({
          where: PUBLISHED,
          select: {
            make: true,
            year: true,
            price: true,
            category: {
              select: { id: true, name: true, pluralName: true, slug: true, position: true },
            },
          },
        });

  const years = [...new Set(pool.map((v) => v.year))].sort((a, b) => b - a);
  const prices = pool.map((v) => Number(v.price));

  const categoryMap = new Map<
    string,
    { id: string; name: string; pluralName: string; slug: string; position: number }
  >();
  for (const row of pool) categoryMap.set(row.category.id, row.category);

  const auto = counts.find((c) => c.vehicleType === "AUTO")?._count._all ?? 0;
  const moto = counts.find((c) => c.vehicleType === "MOTO")?._count._all ?? 0;

  return {
    makes: [...new Set(pool.map((v) => v.make))].sort((a, b) =>
      a.localeCompare(b, "es"),
    ),
    years,
    minYear: years.length > 0 ? Math.min(...years) : new Date().getFullYear(),
    maxYear: years.length > 0 ? Math.max(...years) : new Date().getFullYear(),
    categories: [...categoryMap.values()]
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "es"))
      .map(({ id, name, pluralName, slug }) => ({ id, name, pluralName, slug })),
    minPrice: prices.length > 0 ? Math.min(...prices) : 0,
    maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
    counts: { auto, moto, all: auto + moto },
  };
}

// ---------------------------------------------------------------------------
// Consultas de administración
// ---------------------------------------------------------------------------

export interface AdminVehicleList {
  vehicles: Vehicle[];
  total: number;
  page: number;
  limit: number;
}

/** El admin sí ve borradores y archivados: es su trabajo. */
export async function listAdminVehicles(
  query: AdminVehicleQuery,
): Promise<AdminVehicleList> {
  const where: Prisma.VehicleWhereInput = {};

  if (query.vehicleType) where.vehicleType = toDbVehicleType[query.vehicleType];
  if (query.publication) where.publicationStatus = toDbPublication[query.publication];
  if (query.availability) {
    where.availabilityStatus = toDbAvailability[query.availability];
  }
  if (query.q) {
    where.OR = [
      { make: { contains: query.q, mode: "insensitive" } },
      { model: { contains: query.q, mode: "insensitive" } },
      { version: { contains: query.q, mode: "insensitive" } },
      { slug: { contains: query.q, mode: "insensitive" } },
    ];
  }

  const [records, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: vehicleInclude,
      orderBy: [{ updatedAt: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.vehicle.count({ where }),
  ]);

  return {
    vehicles: records.map((record) => toVehicleDto(record as VehicleRecord)),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const record = await prisma.vehicle.findUnique({
    where: { id },
    include: vehicleInclude,
  });
  return record ? toVehicleDto(record as VehicleRecord) : null;
}

export async function requireVehicle(id: string): Promise<Vehicle> {
  const vehicle = await getVehicleById(id);
  if (!vehicle) throw notFound("Ese vehículo no existe.");
  return vehicle;
}

// ---------------------------------------------------------------------------
// Mutaciones
// ---------------------------------------------------------------------------

async function assertCategory(
  categoryId: string,
  vehicleType: VehicleType,
): Promise<void> {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw notFound("Esa categoría no existe.");
  }
  // Una categoría pertenece a un universo. Un SUV no puede ser una moto.
  if (category.vehicleType !== toDbVehicleType[vehicleType]) {
    throw conflict("Esa categoría no pertenece a ese tipo de vehículo.", {
      categoryId: "Elige una categoría del mismo tipo de vehículo.",
    });
  }
}

/**
 * Crear siempre deja el vehículo en DRAFT. Publicar es una decisión aparte,
 * explícita, con sus propios requisitos.
 */
export async function createVehicle(input: VehicleInput): Promise<Vehicle> {
  await assertCategory(input.categoryId, input.vehicleType);

  const slug = await uniqueVehicleSlug(input, { preferred: input.slug });

  const record = await prisma.vehicle.create({
    data: {
      slug,
      vehicleType: toDbVehicleType[input.vehicleType],
      make: input.make,
      model: input.model,
      version: input.version,
      year: input.year,
      price: BigInt(input.price),
      mileage: input.mileage,
      categoryId: input.categoryId,
      fuelType: input.fuelType,
      transmission: input.transmission,
      drivetrain: input.drivetrain,
      engine: input.engine,
      power: input.power,
      exteriorColor: input.exteriorColor,
      interiorColor: input.interiorColor,
      city: input.city,
      availabilityStatus: toDbAvailability[input.availability],
      publicationStatus: "DRAFT",
      featured: input.featured,
      description: input.description,
      equipment: input.equipment,
    },
    include: vehicleInclude,
  });

  return toVehicleDto(record as VehicleRecord);
}

export async function updateVehicle(
  id: string,
  patch: VehiclePatch,
): Promise<Vehicle> {
  const current = await prisma.vehicle.findUnique({ where: { id } });
  if (!current) throw notFound("Ese vehículo no existe.");

  const vehicleType = patch.vehicleType ?? undefined;
  if (patch.categoryId) {
    await assertCategory(
      patch.categoryId,
      vehicleType ?? (current.vehicleType === "MOTO" ? "moto" : "auto"),
    );
  }

  const data: Prisma.VehicleUpdateInput = {};
  if (vehicleType) data.vehicleType = toDbVehicleType[vehicleType];
  if (patch.make !== undefined) data.make = patch.make;
  if (patch.model !== undefined) data.model = patch.model;
  if (patch.version !== undefined) data.version = patch.version;
  if (patch.year !== undefined) data.year = patch.year;
  if (patch.price !== undefined) data.price = BigInt(patch.price);
  if (patch.mileage !== undefined) data.mileage = patch.mileage;
  if (patch.categoryId) data.category = { connect: { id: patch.categoryId } };
  if (patch.fuelType !== undefined) data.fuelType = patch.fuelType;
  if (patch.transmission !== undefined) data.transmission = patch.transmission;
  if (patch.drivetrain !== undefined) data.drivetrain = patch.drivetrain;
  if (patch.engine !== undefined) data.engine = patch.engine;
  if (patch.power !== undefined) data.power = patch.power;
  if (patch.exteriorColor !== undefined) data.exteriorColor = patch.exteriorColor;
  if (patch.interiorColor !== undefined) data.interiorColor = patch.interiorColor;
  if (patch.city !== undefined) data.city = patch.city;
  if (patch.availability !== undefined) {
    data.availabilityStatus = toDbAvailability[patch.availability];
  }
  if (patch.featured !== undefined) data.featured = patch.featured;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.equipment !== undefined) data.equipment = patch.equipment;

  // El slug es la URL pública: solo cambia si se pide explícitamente, nunca
  // como efecto secundario de corregir una versión o un color.
  if (patch.slug && patch.slug !== current.slug) {
    data.slug = await uniqueVehicleSlug(
      {
        make: patch.make ?? current.make,
        model: patch.model ?? current.model,
        version: patch.version ?? current.version,
      },
      { excludeId: id, preferred: patch.slug },
    );
  }

  const record = await prisma.vehicle.update({
    where: { id },
    data,
    include: vehicleInclude,
  });

  return toVehicleDto(record as VehicleRecord);
}

export async function setPublication(
  id: string,
  publication: PublicationStatus,
): Promise<Vehicle> {
  const vehicle = await requireVehicle(id);

  if (publication === "published") {
    const blockers = publicationBlockers(vehicle);
    if (blockers.length > 0) {
      throw conflict(`No se puede publicar. ${blockers.join(" ")}`);
    }
  }

  const record = await prisma.vehicle.update({
    where: { id },
    data: {
      publicationStatus: toDbPublication[publication],
      // publishedAt marca la primera publicación y no se reescribe: es un
      // dato histórico, no un reflejo del estado actual.
      publishedAt:
        publication === "published" && !vehicle.publishedAt
          ? new Date()
          : undefined,
    },
    include: vehicleInclude,
  });

  return toVehicleDto(record as VehicleRecord);
}

export async function setAvailability(
  id: string,
  availability: AvailabilityStatus,
): Promise<Vehicle> {
  const record = await prisma.vehicle.update({
    where: { id },
    data: { availabilityStatus: toDbAvailability[availability] },
    include: vehicleInclude,
  });
  return toVehicleDto(record as VehicleRecord);
}

/**
 * Borrado real. Se reserva para vehículos sin rastro: si alguien ya preguntó
 * por él, archivarlo conserva esa conversación y borrarlo la mutilaría.
 */
export async function deleteVehicle(id: string): Promise<{ archived: boolean }> {
  const inquiries = await prisma.inquiry.count({ where: { vehicleId: id } });
  if (inquiries > 0) {
    await prisma.vehicle.update({
      where: { id },
      data: { publicationStatus: "ARCHIVED" },
    });
    return { archived: true };
  }

  await prisma.vehicle.delete({ where: { id } });
  return { archived: false };
}

// ---------------------------------------------------------------------------
// Resumen para el dashboard
// ---------------------------------------------------------------------------

export async function getInventoryStats() {
  const [byPublication, byAvailability, total, newInquiries] = await Promise.all([
    prisma.vehicle.groupBy({
      by: ["publicationStatus"],
      _count: { _all: true },
    }),
    prisma.vehicle.groupBy({
      by: ["availabilityStatus"],
      _count: { _all: true },
    }),
    prisma.vehicle.count(),
    prisma.inquiry.count({ where: { status: "NEW" } }),
  ]);

  const pub = (status: string) =>
    byPublication.find((row) => row.publicationStatus === status)?._count._all ?? 0;
  const avail = (status: string) =>
    byAvailability.find((row) => row.availabilityStatus === status)?._count._all ??
    0;

  return {
    total,
    published: pub("PUBLISHED"),
    draft: pub("DRAFT"),
    archived: pub("ARCHIVED"),
    available: avail("AVAILABLE"),
    reserved: avail("RESERVED"),
    sold: avail("SOLD"),
    newInquiries,
  };
}
