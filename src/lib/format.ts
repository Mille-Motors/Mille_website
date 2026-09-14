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
