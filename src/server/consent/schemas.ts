import { z } from "zod";
import { CONSENT_ACTIONS, CONSENT_TYPES } from "@/lib/consent";

/**
 * Los filtros de la pantalla de consentimientos.
 *
 * Un parámetro vacío en la URL significa «sin filtro», no «filtra por cadena
 * vacía»: es la misma convención que los filtros de vehículos y solicitudes.
 */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === "" ? undefined : value));

/** Un día del calendario. El rango se interpreta en UTC, igual que se guarda. */
const civilDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Usa el formato AAAA-MM-DD." })
  .optional()
  .transform((value) => (value === "" ? undefined : value));

export const adminConsentQuerySchema = z
  .object({
    type: z.enum(CONSENT_TYPES).optional(),
    action: z.enum(CONSENT_ACTIONS).optional(),
    source: optionalText(120),
    from: civilDate,
    /** Inclusivo: el servicio lo convierte en «antes del día siguiente». */
    to: civilDate,
    q: optionalText(120),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    page: z.coerce.number().int().min(1).default(1),
  })
  .transform((query) => {
    // Un rango al revés no devuelve nada y parece un fallo del sistema. Se
    // ordena, que es lo que la persona quiso decir.
    if (query.from && query.to && query.from > query.to) {
      return { ...query, from: query.to, to: query.from };
    }
    return query;
  });

export type AdminConsentQuery = z.infer<typeof adminConsentQuerySchema>;

/**
 * Registrar una revocatoria recibida por el canal de atención.
 *
 * `channel` no es decorativo: el art. 2 de la Ley 2300 de 2023 gira sobre
 * los canales que autoriza el consumidor, y saber por dónde llegó una
 * revocatoria es parte de poder demostrar que se atendió.
 */
export const consentRevocationSchema = z.object({
  inquiryId: z.uuid(),
  channel: z.enum(["email", "whatsapp", "other"]),
  note: z.string().trim().max(500).optional(),
});

export type ConsentRevocationInput = z.infer<typeof consentRevocationSchema>;
