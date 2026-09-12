import type { VehicleType } from "@/types/vehicle";
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

/** Cómo se traduce cada orden de la URL a la consulta de la base. */
export const sortToQuery: Record<
  SortKey,
  "recent" | "price-asc" | "price-desc" | "mileage-asc" | "year-desc"
> = {
  recientes: "recent",
  "precio-asc": "price-asc",
  "precio-desc": "price-desc",
  "km-asc": "mileage-asc",
  "anio-desc": "year-desc",
};

/**
 * Que falte `tipo` significa el inventario entero. No hay un estado "sin
 * seleccionar" aparte: /vehiculos y la vista explícita de todo son la misma
 * página, y su URL canónica no lleva `tipo`.
 */
export type TypeFilter = VehicleType | "all";

/**
 * `categoria` viaja como slug, que es lo que va en la URL y lo que la base
 * sabe buscar. Antes era la etiqueta ("Sedán") porque la taxonomía vivía en
 * un mapa fijo del código; ahora las categorías son filas administrables y
 * el slug es su identidad estable.
 */
export interface InventoryFilters {
  tipo: TypeFilter;
  categoria?: string;
  marca?: string;
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  orden: SortKey;
}

/** searchParams tal como los entrega Next. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Un límite ausente o ilegible significa "sin tope por ese lado" — nunca 0,
 * que filtraría todo en silencio.
 */
function bound(value: string | string[] | undefined): number | undefined {
  const raw = first(value);
  if (raw === undefined || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * @param knownMakes Todas las marcas del inventario, no solo las del
 * universo elegido. Una marca que existe pero no tiene nada en este universo
 * es un cero honesto: descartarla ampliaría los resultados en silencio.
 * @param knownCategorySlugs Igual, para las categorías del universo elegido.
 */
export function parseFilters(
  params: RawSearchParams,
  knownMakes: string[],
  knownCategorySlugs: string[] = [],
): InventoryFilters {
  const rawType = first(params.tipo);
  const tipo: TypeFilter = VEHICLE_TYPES.includes(rawType as VehicleType)
    ? (rawType as VehicleType)
    : "all";

  const rawCategory = first(params.categoria)?.toLowerCase();
  const marca = first(params.marca);
  const orden = first(params.orden);

  let minYear = bound(params.minYear);
  let maxYear = bound(params.maxYear);
  // Un rango al revés es un desliz, no un resultado vacío: se lee como venía.
  if (minYear && maxYear && minYear > maxYear) [minYear, maxYear] = [maxYear, minYear];

  let minPrice = bound(params.minPrice);
  let maxPrice = bound(params.maxPrice);
  if (minPrice && maxPrice && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  return {
    tipo,
    categoria:
      rawCategory && knownCategorySlugs.includes(rawCategory)
        ? rawCategory
        : undefined,
    marca: marca && knownMakes.includes(marca) ? marca : undefined,
    minYear,
    maxYear,
    minPrice,
    maxPrice,
    orden: SORT_KEYS.includes(orden as SortKey) ? (orden as SortKey) : "recientes",
  };
}

/** Solo filtros — el selector de tipo y el orden no lo son. */
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
 * La URL canónica de un conjunto de filtros. `tipo=all` y el orden por
 * defecto se omiten para que /vehiculos a secas siga siendo limpia y
 * compartible.
 */
export function buildQuery(filters: Partial<InventoryFilters>): string {
  const params = new URLSearchParams();
  if (filters.tipo && filters.tipo !== "all") params.set("tipo", filters.tipo);
  if (filters.categoria) params.set("categoria", filters.categoria);
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
 * Escalones redondos de precio que cubren el inventario, para que los
 * selects ofrezcan cifras en las que alguien piensa de verdad. Más gruesos a
 * medida que crecen: nadie filtra un carro de 500 millones de 25 en 25.
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
