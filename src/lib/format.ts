/**
 * Colombian formatting helpers. Every price and distance in the UI goes
 * through here so the conventions live in one place.
 */

const cop = new Intl.NumberFormat("es-CO", {
  style: "decimal",
  maximumFractionDigits: 0,
});

/** 289900000 -> "$ 289.900.000" */
export function formatCOP(value: number): string {
  return `$ ${cop.format(Math.round(value))}`;
}

/** 289900000 -> "$ 289.900.000 COP" */
export function formatCOPLong(value: number): string {
  return `${formatCOP(value)} COP`;
}

/** 52000 -> "52.000 km" */
export function formatMileage(km: number): string {
  return `${cop.format(Math.round(km))} km`;
}

export function vehicleTitle(vehicle: {
  make: string;
  model: string;
  version: string;
}): string {
  return [vehicle.make, vehicle.model, vehicle.version]
    .filter(Boolean)
    .join(" ");
}

/**
 * Agrupa los miles a la colombiana: 289900000 -> "289.900.000".
 *
 * Trabaja sobre la cadena de dígitos y no sobre un number, para que un campo
 * a medio escribir se pueda formatear sin pasar por una conversión que
 * perdería los ceros a la izquierda o convertiría "" en 0.
 */
export function groupDigits(digits: string): string {
  const clean = digits.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (clean === "") return "";
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Los dígitos de una cadena cualquiera. "$ 1.000" -> "1000". */
export function onlyDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * El número que representa un texto escrito por una persona, o `null` si no
 * escribió nada. Devolver null y no 0 es la diferencia entre "sin rellenar" y
 * "cero kilómetros", que para MILLE son cosas distintas: un importado nuevo
 * tiene 0 km de verdad.
 */
export function parseGrouped(input: string): number | null {
  const digits = onlyDigits(input);
  if (digits === "") return null;
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : null;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

/**
 * Una fecha de calendario —"2027-03-18"— leída como el día que es.
 *
 * `new Date("2027-03-18")` produce la medianoche UTC, y en Bogotá (UTC−5)
 * eso es el 17 de marzo a las 19:00: un SOAT que vence el 18 se mostraría
 * venciendo el 17. Aquí se construye la fecha con las partes explícitas y se
 * formatea en UTC, así que el día que se guardó es el día que se lee.
 *
 * Devuelve `null` en vez de "Invalid Date" si el texto no es una fecha: la
 * ficha oculta lo que no puede mostrar bien.
 */
const dateOnlyFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDateOnly(value: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isNaN(date.getTime())) return null;
  return dateOnlyFormatter.format(date);
}

/** ¿Esta fecha de calendario ya pasó? Se compara por día, no por instante. */
export function isPastDate(value: string | null, today = new Date()): boolean {
  if (!value) return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const [, year, month, day] = match;
  const target = Date.UTC(Number(year), Number(month) - 1, Number(day));
  const now = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  return target < now;
}

/**
 * Un decimal a la colombiana: 5.6 -> "5,6". Se usa para segundos y kWh,
 * donde la coma decimal es la que lee alguien en Bogotá.
 */
export function formatDecimal(value: number, maxDigits = 1): string {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: maxDigits,
  }).format(value);
}

/** 1.500 -> "1.500". Miles agrupados, sin unidad. */
export function formatInteger(value: number): string {
  return cop.format(Math.round(value));
}
