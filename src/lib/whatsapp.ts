import { site } from "@/data/site";
import { formatCOP, vehicleTitle } from "@/lib/format";
import type { Vehicle } from "@/types/vehicle";

/**
 * Builds wa.me links. No API, no backend — just a prefilled message. Returns
 * `null` while `site.phone` is unset (no real line provisioned yet), so
 * nothing in the app can open a placeholder number.
 */
function whatsappUrl(message: string): string | null {
  if (!site.phone) return null;
  return `https://wa.me/${site.phone.number}?text=${encodeURIComponent(message)}`;
}

export function generalWhatsappUrl(): string | null {
  return whatsappUrl(
    `Hola MILLE, quisiera más información sobre los vehículos disponibles.`,
  );
}

export function vehicleWhatsappUrl(vehicle: Vehicle): string | null {
  return whatsappUrl(
    `Hola MILLE, me interesa el ${vehicleTitle(vehicle)} ${vehicle.year} (${formatCOP(vehicle.price)}). ¿Sigue disponible?`,
  );
}

/**
 * There is no backend to receive the contact form, so "submitting" it can't
 * honestly claim a message was sent or that someone will reach out — once a
 * real line exists this hands the filled-in fields to WhatsApp so the send
 * is real rather than simulated. Returns `null` until then.
 */
export function contactWhatsappUrl(fields: {
  nombre: string;
  telefono: string;
  correo: string;
  vehiculo?: string;
  mensaje?: string;
}): string | null {
  const lines = [
    `Hola MILLE, soy ${fields.nombre}.`,
    `Teléfono: ${fields.telefono}`,
    `Correo: ${fields.correo}`,
  ];
  if (fields.vehiculo) lines.push(`Vehículo de interés: ${fields.vehiculo}`);
  if (fields.mensaje) lines.push(fields.mensaje);
  return whatsappUrl(lines.join("\n"));
}

/** Same honest handoff as {@link contactWhatsappUrl}, for the per-vehicle request modal. */
export function requestWhatsappUrl(
  vehicle: Vehicle,
  intent: "info" | "cita",
  fields: { nombre: string; telefono: string; correo: string; mensaje?: string },
): string | null {
  const opener =
    intent === "cita"
      ? `Hola MILLE, quisiera agendar una cita para ver el ${vehicleTitle(vehicle)} ${vehicle.year}.`
      : `Hola MILLE, quisiera más información sobre el ${vehicleTitle(vehicle)} ${vehicle.year}.`;
  const lines = [
    opener,
    `Nombre: ${fields.nombre}`,
    `Teléfono: ${fields.telefono}`,
    `Correo: ${fields.correo}`,
  ];
  if (fields.mensaje) lines.push(fields.mensaje);
  return whatsappUrl(lines.join("\n"));
}
