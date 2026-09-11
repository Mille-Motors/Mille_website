import { categoriesFor, categoryFromSlug, categorySlug } from "@/lib/categories";
import type { Vehicle, VehicleCategory, VehicleType } from "@/types/vehicle";
import { VEHICLE_TYPES } from "@/types/vehicle";

export const SORT_KEYS = [
  "recientes",
  "precio-asc",
  "precio-desc",
  "km-asc",
  "anio-desc",
] as const;

export type SortKey = (typeof SORT_KEYS)[number];

export const sortLabels: Record<SortKey, string> = {
  recientes: "Más recientes",
  "precio-asc": "Menor precio",
  "precio-desc": "Mayor precio",
  "km-asc": "Menor kilometraje",
  "anio-desc": "Más nuevos",
};

/**
 * `tipo` absent means the whole inventory. There is no separate "unselected"
 * state: /vehiculos and an explicit all view are the same page, and the
 * canonical URL for it carries no `tipo` at all.
 */
export type TypeFilter = VehicleType | "all";

export interface InventoryFilters {
  tipo: TypeFilter;
  categoria?: VehicleCategory;
  marca?: string;
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  orden: SortKey;
}

/** Raw searchParams as Next hands them over. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * An absent or unparseable bound means "no limit on that side" — never 0,
 * which would silently filter everything out.
 */
function bound(value: string | string[] | undefined): number | undefined {
  const raw = first(value);
  if (raw === undefined || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * @param knownMakes Every make in the inventory, not just the ones in the
 * chosen universe. A make that exists but has nothing in this universe is a
 * real, empty answer — dropping it would silently widen the results instead.
 */
export function parseFilters(
  params: RawSearchParams,
  knownMakes: string[],
): InventoryFilters {
  const rawType = first(params.tipo);
  const tipo: TypeFilter = VEHICLE_TYPES.includes(rawType as VehicleType)
    ? (rawType as VehicleType)
    : "all";

  const rawCategory = first(params.categoria);
  const categoria = rawCategory ? categoryFromSlug(rawCategory) : undefined;

  const marca = first(params.marca);
  const orden = first(params.orden);

  let minYear = bound(params.minYear);
  let maxYear = bound(params.maxYear);
  // A reversed range is a slip, not an empty result: read it as written.
  if (minYear && maxYear && minYear > maxYear) [minYear, maxYear] = [maxYear, minYear];

  let minPrice = bound(params.minPrice);
  let maxPrice = bound(params.maxPrice);
  if (minPrice && maxPrice && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  return {
    tipo,
    // A category only survives if it belongs to the chosen universe.
    categoria:
      categoria && (tipo === "all" || categoriesFor(tipo).includes(categoria))
        ? categoria
        : undefined,
    marca: marca && knownMakes.includes(marca) ? marca : undefined,
    minYear,
    maxYear,
    minPrice,
    maxPrice,
    orden: SORT_KEYS.includes(orden as SortKey) ? (orden as SortKey) : "recientes",
  };
}

export function applyFilters(
  vehicles: Vehicle[],
  filters: InventoryFilters,
): Vehicle[] {
  let out = vehicles;

  if (filters.tipo !== "all") {
    out = out.filter((v) => v.vehicleType === filters.tipo);
  }
  if (filters.categoria) out = out.filter((v) => v.category === filters.categoria);
  if (filters.marca) out = out.filter((v) => v.make === filters.marca);

  // Each bound is independent: one side alone is a valid, open-ended range.
  if (filters.minYear !== undefined) out = out.filter((v) => v.year >= filters.minYear!);
  if (filters.maxYear !== undefined) out = out.filter((v) => v.year <= filters.maxYear!);
  if (filters.minPrice !== undefined) {
    out = out.filter((v) => v.price >= filters.minPrice!);
  }
  if (filters.maxPrice !== undefined) {
    out = out.filter((v) => v.price <= filters.maxPrice!);
  }

  const sorted = [...out];
  switch (filters.orden) {
    case "precio-asc":
      sorted.sort((a, b) => a.price - b.price);
      break;
    case "precio-desc":
      sorted.sort((a, b) => b.price - a.price);
      break;
    case "km-asc":
      sorted.sort((a, b) => a.mileage - b.mileage);
      break;
    case "anio-desc":
      sorted.sort((a, b) => b.year - a.year);
      break;
    default:
      sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
  return sorted;
}

/** Filters only — the type selector and sort order are not filters. */
export function activeFilterCount(filters: InventoryFilters): number {
  return [
    filters.categoria,
    filters.marca,
    filters.minYear,
    filters.maxYear,
    filters.minPrice,
    filters.maxPrice,
  ].filter((v) => v !== undefined).length;
}

/**
 * The canonical URL for a filter set. `tipo=all` and the default sort are
 * omitted so the plain /vehiculos URL stays clean and shareable.
 */
export function buildQuery(filters: Partial<InventoryFilters>): string {
  const params = new URLSearchParams();
  if (filters.tipo && filters.tipo !== "all") params.set("tipo", filters.tipo);
  if (filters.categoria) params.set("categoria", categorySlug[filters.categoria]);
  if (filters.marca) params.set("marca", filters.marca);
  if (filters.minYear) params.set("minYear", String(filters.minYear));
  if (filters.maxYear) params.set("maxYear", String(filters.maxYear));
  if (filters.minPrice) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
  if (filters.orden && filters.orden !== "recientes") params.set("orden", filters.orden);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Round price steps that span the inventory, so the selects offer figures a
 * person would actually think in. Coarser as the numbers grow: nobody filters
 * a 500-million-peso car in 25-million increments.
 */
export function priceLadder(min: number, max: number): number[] {
  const M = 1_000_000;
  const steps: number[] = [];
  for (let v = 25; v < 200; v += 25) steps.push(v * M);
  for (let v = 200; v < 600; v += 50) steps.push(v * M);
  for (let v = 600; v <= 2000; v += 100) steps.push(v * M);

  const floor = Math.floor(min / (25 * M)) * 25 * M;
  const ceil = Math.ceil(max / (25 * M)) * 25 * M;
  return steps.filter((v) => v >= floor && v <= ceil);
}

export function inventoryHref(filters: Partial<InventoryFilters>): string {
  return `/vehiculos${buildQuery(filters)}`;
}
