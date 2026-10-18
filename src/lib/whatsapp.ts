import { site } from "@/data/site";
import { formatCOP, vehicleTitle } from "@/lib/format";
import { absoluteUrl, vehiclePath } from "@/lib/seo";
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

/**
 * Para qué escribe alguien desde el botón de WhatsApp del sitio. Cada motivo
 * llega con su propio mensaje ya escrito: quien contesta sabe de entrada si
 * tiene delante a un comprador, a un vendedor o a una cita, y no hace falta
 * que la persona sepa qué decir. Las líneas con `___` son para rellenar: el
 * mensaje se puede editar antes de enviarlo.
 */
export type WhatsappIntent = "general" | "buscar" | "vender" | "cita";

const intentMessages: Record<WhatsappIntent, string> = {
  general: "Hola MILLE, quisiera más información sobre los vehículos disponibles.",
  buscar: [
    "Hola MILLE, estoy buscando un vehículo.",
    "Me interesa: ___",
    "Presupuesto aprox.: ___",
    "Ciudad: ___",
  ].join("\n"),
  vender: [
    "Hola MILLE, quiero hablar de mi vehículo.",
    "Marca/modelo/año: ___",
    "Kilometraje: ___",
    "Ciudad: ___",
  ].join("\n"),
  cita: "Hola MILLE, quisiera agendar una cita.",
};

export function intentWhatsappUrl(intent: WhatsappIntent): string | null {
  return whatsappUrl(intentMessages[intent]);
}

export function generalWhatsappUrl(): string | null {
  return intentWhatsappUrl("general");
}

/**
 * El mensaje de quien pregunta desde la ficha de un vehículo: ya dice cuál,
 * con su precio y con el enlace a la ficha, para que quien contesta lo abra
 * con un toque y no tenga que preguntar "¿cuál de todos?".
 */
export function vehicleWhatsappMessage(vehicle: Vehicle): string {
  return [
    `Hola MILLE, me interesa el ${vehicleTitle(vehicle)} ${vehicle.year}${
      // Un vehículo sin precio no llega al público —la invariante lo impide—,
      // pero el mensaje se arma sin él en vez de escribir "$ 0".
      vehicle.price === null ? "" : ` (${formatCOP(vehicle.price)})`
    }. ¿Sigue disponible?`,
    absoluteUrl(vehiclePath(vehicle.slug)),
  ].join("\n");
}

export function vehicleWhatsappUrl(vehicle: Vehicle): string | null {
  return whatsappUrl(vehicleWhatsappMessage(vehicle));
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
