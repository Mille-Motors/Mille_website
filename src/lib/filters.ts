import type { Vehicle, VehicleCategory } from "@/types/vehicle";
import { VEHICLE_CATEGORIES } from "@/types/vehicle";

export const SORT_KEYS = ["recientes", "precio-asc", "precio-desc", "km-asc"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const sortLabels: Record<SortKey, string> = {
  recientes: "Más recientes",
  "precio-asc": "Menor precio",
  "precio-desc": "Mayor precio",
  "km-asc": "Menor kilometraje",
};

/** Max-price buckets. Whole millions of pesos, ordered ascending. */
export const PRICE_BUCKETS = [
  150_000_000, 200_000_000, 250_000_000, 350_000_000, 500_000_000,
] as const;

export interface InventoryFilters {
  categoria?: VehicleCategory;
  marca?: string;
  desde?: number;
  hasta?: number;
  orden: SortKey;
}

/** Raw searchParams as Next hands them over. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseFilters(
  params: RawSearchParams,
  knownMakes: string[],
): InventoryFilters {
  const categoria = first(params.categoria);
  const marca = first(params.marca);
  const desde = Number(first(params.desde));
  const hasta = Number(first(params.hasta));
  const orden = first(params.orden);

  return {
    categoria: VEHICLE_CATEGORIES.includes(categoria as VehicleCategory)
      ? (categoria as VehicleCategory)
      : undefined,
    marca: marca && knownMakes.includes(marca) ? marca : undefined,
    desde: Number.isFinite(desde) && desde > 1900 ? desde : undefined,
    hasta: Number.isFinite(hasta) && hasta > 0 ? hasta : undefined,
    orden: SORT_KEYS.includes(orden as SortKey) ? (orden as SortKey) : "recientes",
  };
}

export function applyFilters(
  vehicles: Vehicle[],
  filters: InventoryFilters,
): Vehicle[] {
  let out = vehicles;
  if (filters.categoria) out = out.filter((v) => v.category === filters.categoria);
  if (filters.marca) out = out.filter((v) => v.make === filters.marca);
  if (filters.desde) out = out.filter((v) => v.year >= filters.desde!);
  if (filters.hasta) out = out.filter((v) => v.price <= filters.hasta!);

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
    default:
      sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
  return sorted;
}

/** Filters only — sort order is not a filter and never counts as one. */
export function activeFilterCount(filters: InventoryFilters): number {
  return [filters.categoria, filters.marca, filters.desde, filters.hasta].filter(
    Boolean,
  ).length;
}

export function buildQuery(filters: Partial<InventoryFilters>): string {
  const params = new URLSearchParams();
  if (filters.categoria) params.set("categoria", filters.categoria);
  if (filters.marca) params.set("marca", filters.marca);
  if (filters.desde) params.set("desde", String(filters.desde));
  if (filters.hasta) params.set("hasta", String(filters.hasta));
  if (filters.orden && filters.orden !== "recientes") params.set("orden", filters.orden);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
