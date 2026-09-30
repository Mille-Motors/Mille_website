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
 * Los filtros del inventario, tal como viajan en la URL.
 *
 * `categoria` es la CARROCERÍA y viaja como slug, que es lo que va en la URL
 * y lo que la base sabe buscar. El nombre del parámetro se conserva porque
 * ya está en enlaces compartidos; lo que cambió es su contenido, que ahora
 * solo puede ser una carrocería de verdad y nunca un combustible.
 *
 * `combustible`, `transmision` y `traccion` viajan con su etiqueta literal
 * —"Híbrido enchufable", "Integral (AWD)"— porque es lo que la columna
 * guarda: no hay una tabla que traduzca un slug a ese texto, y añadir una
 * capa de traducción solo para acortar la URL crearía dos verdades.
 */
export interface InventoryFilters {
  tipo: TypeFilter;
  categoria?: string;
  marca?: string;
  modelo?: string;
  combustible?: string;
  transmision?: string;
  traccion?: string;
  ciudad?: string;
  /** Carácter del vehículo: "Deportivo", "Off-road"… Nunca carrocería. */
  etiqueta?: string;
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  maxKm?: number;
  orden: SortKey;
}

/** searchParams tal como los entrega Next. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Texto tal cual, recortado; vacío es ausencia de filtro, no filtro vacío. */
function text(value: string | string[] | undefined): string | undefined {
  const raw = first(value)?.trim();
  return raw ? raw : undefined;
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
 * Un filtro presente en la URL nunca desaparece.
 *
 * Antes se validaban categoría y marca contra lo que existía y, si no
 * figuraban, se descartaban: `?categoria=touring` acababa mostrando *todas*
 * las motos y `?marca=Ferrari` el inventario entero, con la URL diciendo que
 * había un filtro puesto. Ampliar resultados en silencio es peor que no
 * devolver ninguno, porque quien mira no tiene forma de notarlo.
 *
 * Ahora el valor viaja tal cual a la consulta. Si no existe, la base
 * devuelve cero y se ve el estado vacío, que es la verdad. Vale igual para
 * los filtros nuevos: `?combustible=Plutonio` da cero, no el inventario.
 *
 * Lo que sí se canonicaliza son los parámetros operativos —orden y rangos
 * ilegibles— porque un orden inválido no ensancha nada: se cae al orden por
 * defecto y los resultados siguen siendo los mismos.
 */
export function parseFilters(params: RawSearchParams): InventoryFilters {
  const rawType = first(params.tipo);
  const tipo: TypeFilter = VEHICLE_TYPES.includes(rawType as VehicleType)
    ? (rawType as VehicleType)
    : "all";

  // El slug de la carrocería es minúsculas por definición; el resto son
  // etiquetas literales y tocarles las mayúsculas las haría dejar de
  // coincidir con lo que guarda la columna.
  const categoria = first(params.categoria)?.trim().toLowerCase();
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
    // Se conservan tal cual: un valor que no existe produce cero resultados,
    // que es exactamente lo que el usuario pidió.
    categoria: categoria || undefined,
    marca: text(params.marca),
    modelo: text(params.modelo),
    combustible: text(params.combustible),
    transmision: text(params.transmision),
    traccion: text(params.traccion),
    ciudad: text(params.ciudad),
    etiqueta: text(params.etiqueta),
    minYear,
    maxYear,
    minPrice,
    maxPrice,
    maxKm: bound(params.maxKm),
    orden: SORT_KEYS.includes(orden as SortKey) ? (orden as SortKey) : "recientes",
  };
}

/**
 * ¿El parámetro `tipo` trae algo que no es un universo?
 *
 * `parseFilters` lo lee como "todo", que es lo razonable para renderizar,
 * pero dejar la URL diciendo `tipo=camion` mientras se muestra el inventario
 * completo hace creer que hay un filtro aplicado. Quien llama lo usa para
 * redirigir a la URL canónica.
 */
export function hasInvalidType(params: RawSearchParams): boolean {
  const raw = first(params.tipo);
  if (raw === undefined || raw === "") return false;
  return !VEHICLE_TYPES.includes(raw as VehicleType);
}

/**
 * Las claves que son filtro de verdad. El selector de tipo y el orden no lo
 * son: uno elige universo y el otro reordena lo mismo. Vive en una constante
 * para que contar filtros activos, limpiarlos y dibujar las fichas de
 * "filtro puesto" no puedan discrepar entre sí.
 */
export const FILTER_KEYS = [
  "categoria",
  "marca",
  "modelo",
  "combustible",
  "transmision",
  "traccion",
  "ciudad",
  "etiqueta",
  "minYear",
  "maxYear",
  "minPrice",
  "maxPrice",
  "maxKm",
] as const satisfies readonly (keyof InventoryFilters)[];

export function activeFilterCount(filters: InventoryFilters): number {
  return FILTER_KEYS.filter((key) => filters[key] !== undefined).length;
}

/** Todos los filtros quitados, conservando universo y orden. */
export function clearedFilters(filters: InventoryFilters): InventoryFilters {
  return { tipo: filters.tipo, orden: filters.orden };
}

/**
 * La URL canónica de un conjunto de filtros. `tipo=all` y el orden por
 * defecto se omiten para que /vehiculos a secas siga siendo limpia y
 * compartible.
 */
export function buildQuery(filters: Partial<InventoryFilters>): string {
  const params = new URLSearchParams();
  if (filters.tipo && filters.tipo !== "all") params.set("tipo", filters.tipo);
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
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

/**
 * Topes de kilometraje con los que alguien piensa de verdad: "hasta 20.000",
 * "hasta 100.000". Se recortan al inventario para no ofrecer un tope por
 * encima del carro más rodado, que devolvería siempre lo mismo.
 */
export function mileageLadder(max: number): number[] {
  const steps = [10_000, 20_000, 30_000, 50_000, 75_000, 100_000, 150_000, 200_000];
  if (max <= 0) return [];
  const useful = steps.filter((step) => step < max);
  // El último escalón cubre el inventario entero por arriba, para que el
  // desplegable no se quede sin una opción que incluya al más rodado.
  const next = steps.find((step) => step >= max);
  return next ? [...useful, next] : useful;
}

export function inventoryHref(filters: Partial<InventoryFilters>): string {
  return `/vehiculos${buildQuery(filters)}`;
}
