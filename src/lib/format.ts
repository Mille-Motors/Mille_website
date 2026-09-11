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
