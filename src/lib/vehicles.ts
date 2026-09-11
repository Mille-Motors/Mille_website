import { mockVehicles } from "@/data/vehicles";
import type {
  InventoryStats,
  Vehicle,
  VehicleCategory,
  VehicleStatus,
  VehicleType,
} from "@/types/vehicle";

/**
 * The single seam between the UI and the inventory source.
 *
 * Everything is async on purpose: today it resolves from a module, later it
 * resolves from a database or an API, and no caller has to change.
 */

/** Statuses a visitor of the public site is allowed to see. */
const PUBLIC_STATUSES: VehicleStatus[] = ["available", "reserved", "sold"];

function isPublic(vehicle: Vehicle): boolean {
  return PUBLIC_STATUSES.includes(vehicle.status);
}

export interface VehicleQuery {
  category?: VehicleCategory;
  make?: string;
  /** Only vehicles from this model year onwards. */
  yearFrom?: number;
  maxPrice?: number;
  featured?: boolean;
  /** Admin surfaces pass true to see drafts as well. */
  includeNonPublic?: boolean;
}

export async function getVehicles(query: VehicleQuery = {}): Promise<Vehicle[]> {
  let results = query.includeNonPublic
    ? [...mockVehicles]
    : mockVehicles.filter(isPublic);

  if (query.category) {
    results = results.filter((v) => v.category === query.category);
  }
  if (query.make) {
    results = results.filter((v) => v.make === query.make);
  }
  if (typeof query.yearFrom === "number") {
    results = results.filter((v) => v.year >= query.yearFrom!);
  }
  if (typeof query.maxPrice === "number") {
    results = results.filter((v) => v.price <= query.maxPrice!);
  }
  if (typeof query.featured === "boolean") {
    results = results.filter((v) => v.featured === query.featured);
  }

  return results.sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

export async function getFeaturedVehicles(limit = 4): Promise<Vehicle[]> {
  const featured = await getVehicles({ featured: true });
  if (featured.length >= limit) return featured.slice(0, limit);

  // Top up with the newest available stock so the home page is never short.
  const fill = (await getVehicles()).filter(
    (v) => !featured.some((f) => f.id === v.id) && v.status === "available",
  );
  return [...featured, ...fill].slice(0, limit);
}

export async function getVehicleBySlug(slug: string): Promise<Vehicle | null> {
  return mockVehicles.find((v) => v.slug === slug && isPublic(v)) ?? null;
}

export async function getRelatedVehicles(
  vehicle: Vehicle,
  limit = 3,
): Promise<Vehicle[]> {
  const pool = (await getVehicles()).filter(
    (v) => v.id !== vehicle.id && v.vehicleType === vehicle.vehicleType,
  );
  const score = (candidate: Vehicle) => {
    let value = 0;
    if (candidate.category === vehicle.category) value += 2;
    if (candidate.make === vehicle.make) value += 1;
    // Closer prices rank higher, capped so it never outweighs category.
    const gap = Math.abs(candidate.price - vehicle.price) / vehicle.price;
    if (gap < 0.35) value += 1;
    return value;
  };
  return [...pool].sort((a, b) => score(b) - score(a)).slice(0, limit);
}

export async function getAllVehicleSlugs(): Promise<string[]> {
  return mockVehicles.filter(isPublic).map((v) => v.slug);
}

export function computeStats(vehicles: Vehicle[]): InventoryStats {
  return {
    total: vehicles.length,
    available: vehicles.filter((v) => v.status === "available").length,
    reserved: vehicles.filter((v) => v.status === "reserved").length,
    sold: vehicles.filter((v) => v.status === "sold").length,
    draft: vehicles.filter((v) => v.status === "draft").length,
  };
}

export async function getInventoryStats(): Promise<InventoryStats> {
  return computeStats(await getVehicles({ includeNonPublic: true }));
}

export interface InventoryFacets {
  makes: string[];
  /** Descending, so the newest model year is offered first. */
  years: number[];
  minYear: number;
  maxYear: number;
  categories: VehicleCategory[];
  minPrice: number;
  maxPrice: number;
  counts: { auto: number; moto: number; all: number };
}

/**
 * Filter options, derived from the inventory that is actually visible rather
 * than hardcoded. Pass a type to narrow them to that universe: browsing motos
 * should never be offered a make that only exists among the cars.
 *
 * Today the source is the mocks; when it becomes a database the derivation
 * moves with it and the callers stay the same.
 */
export async function getFilterFacets(
  type: VehicleType | "all" = "all",
): Promise<InventoryFacets> {
  const all = await getVehicles();
  const scoped = type === "all" ? all : all.filter((v) => v.vehicleType === type);
  // Fall back to the full inventory so an empty universe still yields a
  // usable (if unfiltered) set of bounds instead of Infinity.
  const pool = scoped.length > 0 ? scoped : all;

  const years = [...new Set(pool.map((v) => v.year))].sort((a, b) => b - a);
  const prices = pool.map((v) => v.price);

  return {
    makes: [...new Set(pool.map((v) => v.make))].sort((a, b) =>
      a.localeCompare(b, "es"),
    ),
    years,
    minYear: Math.min(...years),
    maxYear: Math.max(...years),
    categories: [...new Set(pool.map((v) => v.category))],
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    counts: {
      auto: all.filter((v) => v.vehicleType === "auto").length,
      moto: all.filter((v) => v.vehicleType === "moto").length,
      all: all.length,
    },
  };
}
