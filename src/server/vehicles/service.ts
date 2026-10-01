import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { conflict, notFound } from "@/server/http/errors";
import { vehicleTitle } from "@/lib/format";
import { publicationBlockers } from "@/lib/publication";
import { DEFAULT_VEHICLE_TYPE } from "@/lib/vehicle-defaults";
import type { VehicleSitemapEntry } from "@/lib/seo";
import { planVehicleDeletion } from "@/lib/vehicle-deletion";
import { VEHICLE_IMAGE_BUCKET } from "@/server/auth/config";
import { deleteStoredImage } from "@/server/storage/images";
import { uniqueVehicleSlug } from "@/server/vehicles/slug";
import {
  fromDateString,
  fromDbVehicleType,
  toDbAvailability,
  toDbPublication,
  toDbVehicleType,
  toVehicleDto,
  vehicleInclude,
  type VehicleRecord,
} from "@/server/vehicles/mapper";
import type {
  AdminVehicleQuery,
  AdminVehicleSort,
  VehicleInput,
  VehiclePatch,
} from "@/server/vehicles/schemas";
import {
  DRIVETRAINS,
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_TAGS,
} from "@/types/vehicle";
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
  /** La carrocería, por slug. */
  categorySlug?: string;
  make?: string;
  model?: string;
  fuelType?: string;
  transmission?: string;
  drivetrain?: string;
  city?: string;
  /** Carácter del vehículo: "Deportivo", "Off-road"… */
  tag?: string;
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  maxMileage?: number;
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
    // `active` solo se exige en el filtro explícito. Una categoría retirada
    // deja de ser un camino de navegación, pero los vehículos publicados que
    // la usan siguen apareciendo en el inventario general: despublicar es una
    // decisión sobre el vehículo, no sobre su taxonomía.
    where.category = { slug: query.categorySlug, active: true };
  }
  if (query.make) where.make = query.make;
  if (query.model) where.model = query.model;
  if (query.featured !== undefined) where.featured = query.featured;

  // Cada filtro es una condición MÁS, nunca una alternativa: carrocería SUV
  // con combustible enchufable devuelve las SUV enchufables, no la unión.
  if (query.fuelType) where.fuelType = query.fuelType;
  if (query.transmission) where.transmission = query.transmission;
  if (query.drivetrain) where.drivetrain = query.drivetrain;
  if (query.city) where.city = query.city;
  // `has` se traduce a `tags @> ARRAY[...]`, que es lo que sabe usar el
  // índice GIN de la columna.
  if (query.tag) where.tags = { has: query.tag };

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
  if (query.maxMileage !== undefined) where.mileage = { lte: query.maxMileage };

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

/**
 * Lo que el sitemap necesita de cada vehículo visible: su slug y cuándo
 * cambió por última vez. Solo publicados —un borrador o un archivado no
 * tienen URL pública que ofrecer— y sin traerse la ficha entera, que para
 * escribir una línea de XML no hace falta.
 */
export async function listPublicVehicleSitemapEntries(): Promise<
  VehicleSitemapEntry[]
> {
  const rows = await prisma.vehicle.findMany({
    where: PUBLISHED,
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((row) => ({
    slug: row.slug,
    updatedAt: row.updatedAt.toISOString(),
  }));
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
    if (
      candidate.category &&
      vehicle.category &&
      candidate.category.id === vehicle.category.id
    ) {
      value += 2;
    }
    if (candidate.make === vehicle.make) value += 1;
    // La cercanía de precio solo puntúa si los dos lo tienen.
    if (candidate.price !== null && vehicle.price !== null) {
      const gap = Math.abs(candidate.price - vehicle.price) / (vehicle.price || 1);
      if (gap < 0.35) value += 1;
    }
    return value;
  };

  return [...pool].sort((a, b) => score(b) - score(a)).slice(0, limit);
}

export interface CategoryFacet {
  id: string;
  name: string;
  pluralName: string;
  slug: string;
}

export interface InventoryFacets {
  makes: string[];
  /** Pares marca→modelo, para poder acotar el modelo a la marca elegida. */
  models: { make: string; model: string }[];
  /** Descendente, para ofrecer primero el año más nuevo. */
  years: number[];
  minYear: number;
  maxYear: number;
  /** Las carrocerías presentes en el inventario visible. */
  categories: CategoryFacet[];
  /**
   * La taxonomía activa del universo, haya o no vehículos detrás.
   *
   * `categories` es lo que se ofrece normalmente —solo lo que existe, para
   * no prometer filtros que darían cero—, pero con el inventario vacío esa
   * lista también lo está, y un panel de filtros sin un solo control parece
   * roto. Esta es la lista con la que el filtro se puede seguir dibujando y
   * explicando qué se podrá filtrar cuando haya stock.
   */
  allCategories: CategoryFacet[];
  fuelTypes: string[];
  transmissions: string[];
  drivetrains: string[];
  cities: string[];
  tags: string[];
  minPrice: number;
  maxPrice: number;
  maxMileage: number;
  counts: { auto: number; moto: number; all: number };
}

/**
 * Las opciones de los filtros salen del inventario realmente visible, no de
 * una lista fija. Al pasar un tipo se acotan a ese universo: quien navega
 * motos no debería ver una marca que solo existe entre los carros.
 *
 * Ofrecer solo lo que existe es lo que evita el peor resultado de un panel
 * de filtros: elegir tres cosas plausibles y recibir cero sin entender por
 * qué. Por eso los vocabularios cerrados —combustible, tracción— también se
 * recortan aquí en vez de volcarse enteros desde `src/types/vehicle.ts`.
 *
 * Se ordenan según esas listas y no alfabéticamente: "Gasolina, Diésel,
 * Híbrido, Enchufable, Eléctrico" es una secuencia que significa algo.
 */
/** Lo que de verdad hay en el inventario, sin los que nadie ha elegido. */
function presentValues(values: (string | null)[]): Set<string> {
  return new Set(values.filter((value): value is string => Boolean(value)));
}

function orderedByVocabulary(
  present: Set<string>,
  vocabulary: readonly string[],
): string[] {
  const known = vocabulary.filter((value) => present.has(value));
  // Un valor que ya no está en la lista canónica —una fila vieja— se sigue
  // ofreciendo al final: existe en el inventario, así que filtrar por él
  // devuelve algo. Esconderlo haría inalcanzables esos vehículos.
  const unknown = [...present]
    .filter((value) => !vocabulary.includes(value))
    .sort((a, b) => a.localeCompare(b, "es"));
  return [...known, ...unknown];
}

export async function getInventoryFacets(
  type: VehicleType | "all" = "all",
): Promise<InventoryFacets> {
  const scopeWhere: Prisma.VehicleWhereInput =
    type === "all"
      ? { ...PUBLISHED }
      : { ...PUBLISHED, vehicleType: toDbVehicleType[type] };

  const [pool, counts, taxonomy] = await Promise.all([
    prisma.vehicle.findMany({
      where: scopeWhere,
      select: {
        make: true,
        model: true,
        year: true,
        price: true,
        mileage: true,
        fuelType: true,
        transmission: true,
        drivetrain: true,
        city: true,
        tags: true,
        category: {
          select: {
            id: true,
            name: true,
            pluralName: true,
            slug: true,
            position: true,
            active: true,
          },
        },
      },
    }),
    prisma.vehicle.groupBy({
      by: ["vehicleType"],
      where: PUBLISHED,
      _count: { _all: true },
    }),
    // La taxonomía activa del universo. Son trece filas cortas: traerlas
    // siempre cuesta menos que decidir si hacen falta.
    prisma.category.findMany({
      where: {
        active: true,
        ...(type === "all" ? {} : { vehicleType: toDbVehicleType[type] }),
      },
      orderBy: [{ vehicleType: "asc" }, { position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, pluralName: true, slug: true },
    }),
  ]);

  // Sin fallback al otro universo. Si no hay motos publicadas, las facetas de
  // motos son vacías: ofrecer marcas, categorías, años y precios de los
  // carros sería prometer filtros que darían cero y contradecir al propio
  // contador, que ya dice 0. Un universo vacío se representa vacío.

  // Solo lo publicado llega aquí y publicar exige año, pero el tipo admite
  // null: se filtra antes de ordenar para que un borrador colado no meta un
  // hueco en el desplegable.
  const years = [
    ...new Set(
      pool
        .map((v) => v.year)
        .filter((year): year is number => year !== null),
    ),
  ].sort((a, b) => b - a);
  // Solo lo publicado llega hasta aquí, y publicar exige precio y
  // kilometraje, así que en la práctica no hay nulos. Se filtran de todos
  // modos: un null colado convertiría la escalera de precios en NaN y
  // dejaría los dos desplegables sin una sola opción.
  const prices = pool
    .map((v) => (v.price === null ? null : Number(v.price)))
    .filter((value): value is number => value !== null);
  const mileages = pool
    .map((v) => v.mileage)
    .filter((value): value is number => value !== null);

  // Una categoría desactivada deja de ofrecerse como navegación, pero los
  // vehículos publicados que la usan siguen contando para marcas, años y
  // precios: desactivar taxonomía no despublica inventario.
  const categoryMap = new Map<
    string,
    { id: string; name: string; pluralName: string; slug: string; position: number }
  >();
  for (const row of pool) {
    if (row.category?.active) categoryMap.set(row.category.id, row.category);
  }

  const modelMap = new Map<string, { make: string; model: string }>();
  for (const row of pool) {
    modelMap.set(`${row.make}\u0000${row.model}`, {
      make: row.make,
      model: row.model,
    });
  }

  const auto = counts.find((c) => c.vehicleType === "AUTO")?._count._all ?? 0;
  const moto = counts.find((c) => c.vehicleType === "MOTO")?._count._all ?? 0;

  return {
    makes: [...new Set(pool.map((v) => v.make))].sort((a, b) =>
      a.localeCompare(b, "es"),
    ),
    models: [...modelMap.values()].sort(
      (a, b) =>
        a.make.localeCompare(b.make, "es") || a.model.localeCompare(b.model, "es"),
    ),
    years,
    minYear: years.length > 0 ? Math.min(...years) : new Date().getFullYear(),
    maxYear: years.length > 0 ? Math.max(...years) : new Date().getFullYear(),
    categories: [...categoryMap.values()]
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "es"))
      .map(({ id, name, pluralName, slug }) => ({ id, name, pluralName, slug })),
    allCategories: taxonomy,
    fuelTypes: orderedByVocabulary(
      presentValues(pool.map((v) => v.fuelType)),
      FUEL_TYPES,
    ),
    transmissions: orderedByVocabulary(
      presentValues(pool.map((v) => v.transmission)),
      TRANSMISSIONS,
    ),
    drivetrains: orderedByVocabulary(
      presentValues(pool.map((v) => v.drivetrain)),
      DRIVETRAINS,
    ),
    cities: [...presentValues(pool.map((v) => v.city))].sort((a, b) =>
      a.localeCompare(b, "es"),
    ),
    tags: orderedByVocabulary(
      new Set(pool.flatMap((v) => v.tags)),
      VEHICLE_TAGS,
    ),
    minPrice: prices.length > 0 ? Math.min(...prices) : 0,
    maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
    maxMileage: mileages.length > 0 ? Math.max(...mileages) : 0,
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

/**
 * Traduce la consulta del admin a una cláusula de Prisma.
 *
 * Todo se resuelve en la base: con 22 vehículos daría igual, pero traer el
 * inventario entero al navegador para descartarlo allí deja de funcionar
 * mucho antes de lo que parece, y el día que deje de funcionar habrá que
 * reescribir la pantalla en vez de cambiar un número.
 */
function adminWhere(query: AdminVehicleQuery): Prisma.VehicleWhereInput {
  const where: Prisma.VehicleWhereInput = {};

  if (query.vehicleType) where.vehicleType = toDbVehicleType[query.vehicleType];
  if (query.publication) where.publicationStatus = toDbPublication[query.publication];
  if (query.availability) {
    where.availabilityStatus = toDbAvailability[query.availability];
  }
  if (query.make) where.make = query.make;
  if (query.categoryId) where.categoryId = query.categoryId;

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

  if (query.q) {
    where.OR = [
      { make: { contains: query.q, mode: "insensitive" } },
      { model: { contains: query.q, mode: "insensitive" } },
      { version: { contains: query.q, mode: "insensitive" } },
      { slug: { contains: query.q, mode: "insensitive" } },
    ];
  }

  return where;
}

const adminOrderBy: Record<
  AdminVehicleSort,
  Prisma.VehicleOrderByWithRelationInput[]
> = {
  updated: [{ updatedAt: "desc" }],
  "created-desc": [{ createdAt: "desc" }],
  "created-asc": [{ createdAt: "asc" }],
  "price-asc": [{ price: "asc" }],
  "price-desc": [{ price: "desc" }],
  "year-asc": [{ year: "asc" }],
  "year-desc": [{ year: "desc" }],
};

/** El admin sí ve borradores y archivados: es su trabajo. */
export async function listAdminVehicles(
  query: AdminVehicleQuery,
): Promise<AdminVehicleList> {
  const where = adminWhere(query);

  const [records, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: vehicleInclude,
      // El id desempata para que la paginación sea estable: sin un criterio
      // total, dos filas con el mismo updatedAt pueden cambiar de orden entre
      // páginas y una de ellas no aparecer nunca.
      orderBy: [...adminOrderBy[query.sort], { id: "asc" }],
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

export interface AdminVehicleFilterOptions {
  makes: string[];
  categories: { id: string; name: string; vehicleType: VehicleType }[];
  years: { min: number; max: number } | null;
}

/**
 * Las opciones de los desplegables salen del inventario real, no de una lista
 * fija: si MILLE nunca ha tenido un Porsche, filtrar por Porsche no debería
 * ni ofrecerse. Incluye borradores y archivados, porque el admin también
 * necesita encontrarlos.
 */
export async function getAdminFilterOptions(): Promise<AdminVehicleFilterOptions> {
  const [makeRows, categories, bounds] = await Promise.all([
    prisma.vehicle.findMany({
      select: { make: true },
      distinct: ["make"],
      orderBy: { make: "asc" },
    }),
    prisma.category.findMany({
      orderBy: [{ vehicleType: "asc" }, { position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, vehicleType: true },
    }),
    prisma.vehicle.aggregate({ _min: { year: true }, _max: { year: true } }),
  ]);

  return {
    makes: makeRows.map((row) => row.make).sort((a, b) => a.localeCompare(b, "es")),
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      vehicleType: fromDbVehicleType[category.vehicleType],
    })),
    years:
      bounds._min.year !== null && bounds._max.year !== null
        ? { min: bounds._min.year, max: bounds._max.year }
        : null,
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
  categoryId: string | null,
  vehicleType: VehicleType,
): Promise<void> {
  // Sin carrocería elegida no hay nada que comprobar: es un borrador a
  // medias, y publicarlo ya lo impide `publicationBlockers()`.
  if (!categoryId) return;
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
 * Un vehículo publicado tiene que seguir cumpliendo lo que se le exigió para
 * publicarlo.
 *
 * Antes `publicationBlockers()` solo corría al publicar, así que después
 * quedaban caminos para dejar una ficha pública rota: borrar su última
 * fotografía, ponerle precio 0, o cambiarle el tipo dejándole una categoría
 * del otro universo. La comprobación vive ahora aquí y la llaman todas las
 * mutaciones que pueden romperla.
 *
 * Se ejecuta DENTRO de la transacción, leyendo el estado ya modificado: al
 * lanzar, Prisma revierte y la base nunca llega a quedar en un estado
 * inválido. No se despublica automáticamente —sería una sorpresa para quien
 * administra— sino que se rechaza el cambio explicando qué rompería.
 */
export async function assertPublishedInvariant(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<Vehicle> {
  const record = await tx.vehicle.findUnique({
    where: { id },
    include: vehicleInclude,
  });
  if (!record) throw notFound("Ese vehículo no existe.");

  const vehicle = toVehicleDto(record as VehicleRecord);
  if (vehicle.publication !== "published") return vehicle;

  const blockers = publicationBlockers(vehicle);
  if (blockers.length > 0) {
    throw conflict(
      `Este vehículo está publicado y el cambio lo dejaría incompleto. ${blockers.join(" ")} ` +
        "Despublícalo primero si quieres dejarlo así.",
    );
  }
  return vehicle;
}

/**
 * Los campos que viajan del formulario a la fila sin traducción alguna.
 *
 * Están en una lista y no en sesenta asignaciones repetidas porque crear y
 * editar tienen que guardar exactamente lo mismo: el día que se añade un
 * campo al esquema y se olvida en `updateVehicle`, el admin lo escribe, ve
 * "Cambios guardados" y el dato no está en ninguna parte. Una sola lista
 * hace imposible esa asimetría.
 *
 * Fuera quedan los cinco que sí necesitan traducción —tipo, precio,
 * categoría, disponibilidad y slug— y se escriben a mano justo debajo.
 */
const DIRECT_FIELDS = [
  "make",
  "model",
  "version",
  "year",
  "mileage",
  "fuelType",
  "transmission",
  "drivetrain",
  "engine",
  "exteriorColor",
  "interiorColor",
  "city",
  "featured",
  "description",
  "engineLayout",
  "cylinders",
  "displacementCc",
  "aspiration",
  "powerHp",
  "torqueNm",
  "accel0100",
  "topSpeedKph",
  "topSpeedLimited",
  "topSpeedLimitedKph",
  "curbWeightKg",
  "icePowerHp",
  "iceTorqueNm",
  "electricMotorCount",
  "electricPowerHp",
  "electricTorqueNm",
  "electricMotorLayout",
  "hybridSystem",
  "batteryGrossKwh",
  "batteryNetKwh",
  "electricRangeKm",
  "rangeStandard",
  "chargeAcKw",
  "chargeDcKw",
  "chargeConnector",
  "chargeTimeNote",
  "registrationCity",
  "plateLastDigit",
  "soatValid",
  "techInspectionApplies",
  "taxStatus",
  "taxesPaidThroughYear",
  "documentationNotes",
  "funFactEnabled",
  "funFactTitle",
  "funFactBody",
  "features",
  "equipment",
  "specialEquipment",
  "tags",
] as const satisfies readonly (keyof VehicleInput)[];

/** Las tres fechas, que sí necesitan pasar de "YYYY-MM-DD" a `Date`. */
const DATE_FIELDS = [
  "soatExpiresOn",
  "techInspectionExpiresOn",
  "documentationCheckedOn",
] as const satisfies readonly (keyof VehicleInput)[];

/** Copia solo las claves presentes: `undefined` en un parche es "no lo toques". */
function pickDefined<T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[],
): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

function dateFields(patch: VehiclePatch): Record<string, Date | null> {
  const out: Record<string, Date | null> = {};
  for (const key of DATE_FIELDS) {
    const value = patch[key];
    if (value !== undefined) out[key] = fromDateString(value);
  }
  return out;
}

/**
 * `specialEquipment` es una columna JSON: Prisma la espera como valor
 * serializable, no como el tipo del dominio.
 */
function toJsonSpecialEquipment(
  items: VehicleInput["specialEquipment"],
): Prisma.InputJsonValue {
  return items.map((item) => ({
    name: item.name,
    description: item.description,
  }));
}

/**
 * Un borrador vacío al que ya se le pueden colgar fotografías.
 *
 * Existe porque las imágenes cuelgan de un vehículo: la ruta en Storage es
 * `vehicles/<id>`, la fila `VehicleImage` lleva su clave ajena y el borrado
 * en cascada depende de ella. Sin un id no hay dónde ponerlas, y eso
 * obligaba a escribir marca, modelo, precio y descripción ANTES de poder
 * subir una foto — un orden que no existe en el trabajo real.
 *
 * La alternativa era un almacén temporal de imágenes sin dueño, con su
 * caducidad y su propio riesgo de huérfanos. No hace falta: DRAFT ya
 * significa "todavía no está listo", y ahora las columnas lo permiten.
 *
 * Los valores iniciales son los de `VEHICLE_DEFAULTS`, los mismos que el
 * formulario enseña seleccionados desde el primer render. El borrador guarda
 * lo que la pantalla ya estaba diciendo; no decide nada por su cuenta.
 *
 * Quien llama debe hacerlo solo cuando hace falta persistir de verdad —la
 * primera fotografía, el primer guardado— y no al abrir la pantalla: eso
 * llenaría la base de filas vacías a golpe de visita.
 */
export async function createDraftVehicle(): Promise<Vehicle> {
  // Un borrador sin nombre no puede llamarse "vehiculo" a secas: colisionaría
  // con el siguiente y el sufijo numérico crecería sin decir nada. `borrador`
  // se reconoce de un vistazo en la lista, y el slug se rehace solo en cuanto
  // haya marca y modelo (ver `updateVehicle`).
  const slug = await uniqueVehicleSlug(
    { make: "", model: "", version: "" },
    { preferred: "borrador" },
  );

  const record = await prisma.vehicle.create({
    data: {
      slug,
      // Lo único que se afirma. Ni carrocería, ni combustible, ni
      // transmisión, ni tracción, ni ciudad, ni año: nadie los ha elegido
      // todavía, y escribir el primer valor de cada lista sería inventarlos.
      vehicleType: toDbVehicleType[DEFAULT_VEHICLE_TYPE],
      publicationStatus: "DRAFT",
    },
    include: vehicleInclude,
  });

  return toVehicleDto(record as VehicleRecord);
}

/**
 * ¿Este borrador está literalmente vacío?
 *
 * Se usa para no dejar basura cuando la creación del borrador se hizo solo
 * para poder subir una foto y la subida falló. Un borrador con una foto, o
 * con una sola palabra escrita, ya es trabajo de alguien y no se toca.
 */
export async function isEmptyDraft(id: string): Promise<boolean> {
  const record = await prisma.vehicle.findUnique({
    where: { id },
    select: {
      publicationStatus: true,
      make: true,
      model: true,
      version: true,
      description: true,
      price: true,
      mileage: true,
      _count: { select: { images: true, inquiries: true } },
    },
  });
  if (!record) return false;

  return (
    record.publicationStatus === "DRAFT" &&
    record.make.trim() === "" &&
    record.model.trim() === "" &&
    record.version.trim() === "" &&
    record.description.trim() === "" &&
    record.price === null &&
    record.mileage === null &&
    record._count.images === 0 &&
    record._count.inquiries === 0
  );
}

/**
 * Deshacer un borrador que se creó solo para poder subir una foto y cuya
 * subida falló.
 *
 * Es deliberadamente más estrecho que `deleteVehicle`: solo toca borradores
 * y solo si nadie ha preguntado por ellos. Así, un identificador equivocado
 * no puede llevarse por delante un vehículo publicado. Si la subida alcanzó
 * a crear alguna imagen antes de fallar, `deleteVehicle` se encarga también
 * de sus objetos en el bucket: el administrador nunca las vio y quedarían
 * como basura.
 */
export async function discardDraftVehicle(id: string): Promise<void> {
  const record = await prisma.vehicle.findUnique({
    where: { id },
    select: {
      publicationStatus: true,
      _count: { select: { inquiries: true } },
    },
  });
  if (!record) throw notFound("Ese vehículo no existe.");
  if (record.publicationStatus !== "DRAFT" || record._count.inquiries > 0) {
    throw conflict("Ese vehículo no es un borrador descartable.");
  }
  await deleteVehicle(id);
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
      ...pickDefined(input, DIRECT_FIELDS),
      ...dateFields(input),
      specialEquipment: toJsonSpecialEquipment(input.specialEquipment),
      slug,
      vehicleType: toDbVehicleType[input.vehicleType],
      price: input.price === null ? null : BigInt(input.price),
      categoryId: input.categoryId,
      availabilityStatus: toDbAvailability[input.availability],
      publicationStatus: "DRAFT",
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

  const currentType = fromDbVehicleType[current.vehicleType];
  const vehicleType = patch.vehicleType ?? undefined;
  const nextType = vehicleType ?? currentType;

  /**
   * Cambiar de universo no puede arrastrar una carrocería del otro: una moto
   * con carrocería "SUV" no significa nada.
   *
   * Antes esto lanzaba un conflicto y obligaba a mandar la carrocería nueva
   * en la misma petición. Ahora que puede no haberla, la respuesta honesta
   * es dejarla en blanco: pasar de carro a moto hace que la carrocería deje
   * de conocerse, y publicar volverá a exigirla. Si el vehículo estaba
   * publicado, `assertPublishedInvariant()` lo revierte al final de la
   * transacción, así que esto solo puede ocurrirle a un borrador.
   */
  let clearCategory = patch.categoryId === null;
  if (patch.categoryId) {
    await assertCategory(patch.categoryId, nextType);
  } else if (vehicleType && vehicleType !== currentType && current.categoryId) {
    const keeps = await prisma.category.findFirst({
      where: { id: current.categoryId, vehicleType: toDbVehicleType[nextType] },
      select: { id: true },
    });
    clearCategory = keeps === null;
  }

  const data: Prisma.VehicleUpdateInput = {
    ...pickDefined(patch, DIRECT_FIELDS),
    ...dateFields(patch),
  };

  if (patch.specialEquipment !== undefined) {
    data.specialEquipment = toJsonSpecialEquipment(patch.specialEquipment);
  }
  if (vehicleType) data.vehicleType = toDbVehicleType[vehicleType];
  if (patch.price !== undefined) {
    data.price = patch.price === null ? null : BigInt(patch.price);
  }
  if (patch.categoryId) {
    data.category = { connect: { id: patch.categoryId } };
  } else if (clearCategory) {
    data.category = { disconnect: true };
  }
  if (patch.availability !== undefined) {
    data.availabilityStatus = toDbAvailability[patch.availability];
  }
  // El aviso de revisión solo se puede QUITAR desde el formulario, nunca
  // escribir: lo pone una migración cuando no pudo decidir sola.
  if (patch.reviewNote === null) data.reviewNote = null;

  // El slug es la URL pública: una vez publicado NO cambia, ni siquiera al
  // corregir la versión o el color. Romper enlaces compartidos para arreglar
  // una errata es mal negocio.
  //
  // Antes de la primera publicación es al revés. Un borrador nace sin nombre
  // —se puede empezar por las fotos— y su slug provisional es "borrador"; si
  // se quedara congelado, el carro acabaría publicado en /vehiculos/borrador.
  // Así que mientras nunca haya sido público, el slug se rehace a partir de
  // marca, modelo y versión.
  const name = {
    make: patch.make ?? current.make,
    model: patch.model ?? current.model,
    version: patch.version ?? current.version,
  };

  if (patch.slug && patch.slug !== current.slug) {
    data.slug = await uniqueVehicleSlug(name, {
      excludeId: id,
      preferred: patch.slug,
    });
  } else if (current.publishedAt === null && vehicleTitle(name).trim() !== "") {
    const derived = await uniqueVehicleSlug(name, { excludeId: id });
    if (derived !== current.slug) data.slug = derived;
  }

  return prisma.$transaction(async (tx) => {
    await tx.vehicle.update({ where: { id }, data });
    // Si el cambio deja publicado algo que no podría publicarse, esto lanza y
    // la transacción revierte: la base no llega a guardarlo.
    return assertPublishedInvariant(tx, id);
  });
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

export interface VehicleDeletionResult {
  archived: boolean;
  /** Objetos del bucket borrados junto con el vehículo. */
  removedObjects: number;
  /** Los que no se pudieron borrar. Quien llama decide si lo registra. */
  failedObjects: string[];
}

/**
 * Borrado real. Se reserva para vehículos sin rastro: si alguien ya preguntó
 * por él, archivarlo conserva esa conversación y borrarlo la mutilaría.
 *
 * El orden importa y es el motivo de que esta función exista tal cual:
 *
 *   1. se anotan las rutas de Storage ANTES de borrar, porque el borrado en
 *      cascada de VehicleImage se las lleva y después ya no hay forma de
 *      saber qué archivo pertenecía a qué vehículo;
 *   2. se borra de la base;
 *   3. solo si la base confirmó, se borran los archivos.
 *
 * Al revés —borrar los archivos primero— un fallo a mitad dejaría filas
 * apuntando a imágenes que ya no existen, que es peor que un archivo de más.
 * Lo que queda si falla el paso 3 es un objeto huérfano, y por eso se informa
 * en vez de tragárselo.
 */
export async function deleteVehicle(
  id: string,
): Promise<VehicleDeletionResult> {
  const [inquiries, images] = await Promise.all([
    prisma.inquiry.count({ where: { vehicleId: id } }),
    prisma.vehicleImage.findMany({
      where: { vehicleId: id },
      select: { source: true, storagePath: true },
    }),
  ]);

  const plan = planVehicleDeletion(inquiries, images);

  if (plan.archived) {
    await prisma.vehicle.update({
      where: { id },
      data: { publicationStatus: "ARCHIVED" },
    });
    return { archived: true, removedObjects: 0, failedObjects: [] };
  }

  await prisma.vehicle.delete({ where: { id } });

  // La base ya no referencia nada: a partir de aquí cualquier archivo que
  // quede es basura, y no borrarlo sería dejarla acumularse en silencio.
  const failedObjects: string[] = [];
  let removedObjects = 0;
  for (const storagePath of plan.storagePaths) {
    const removed = await deleteStoredImage(VEHICLE_IMAGE_BUCKET, storagePath);
    if (removed) removedObjects += 1;
    else failedObjects.push(storagePath);
  }

  if (failedObjects.length > 0) {
    console.error("[mille:vehicles] quedaron objetos huérfanos al borrar", {
      vehicleId: id,
      bucket: VEHICLE_IMAGE_BUCKET,
      failedObjects,
    });
  }

  return { archived: false, removedObjects, failedObjects };
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
