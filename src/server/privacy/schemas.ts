import { z } from "zod";
import {
  PRIVACY_REQUEST_CHANNELS,
  PRIVACY_REQUEST_STATUSES,
  PRIVACY_REQUEST_TYPES,
} from "@/lib/privacy-requests";

/**
 * Validación de las solicitudes de derechos del Titular.
 *
 * Las escribe el equipo, no el público: una revocatoria o una supresión
 * llegan por correo o WhatsApp y alguien las registra. Aun así se validan
 * igual que lo público, porque el error que se evita es el mismo —una fila
 * que no se puede atender— y porque este es el expediente que habría que
 * enseñar si la SIC pregunta.
 */

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const civilDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Usa el formato AAAA-MM-DD." });

export const privacyRequestCreateSchema = z
  .object({
    type: z.enum(PRIVACY_REQUEST_TYPES),
    channel: z.enum(PRIVACY_REQUEST_CHANNELS),
    /** El día en que el titular la presentó. De aquí sale el plazo. */
    receivedOn: civilDate,
    titularName: z
      .string()
      .trim()
      .min(2, { message: "Indica el nombre del titular." })
      .max(120),
    titularEmail: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      z.email({ message: "Indica un correo válido." }).max(200).optional(),
    ),
    titularPhone: optionalText(30),
    identityVerified: z.boolean().default(false),
    identityNote: optionalText(300),
    subject: optionalText(2000),
    notes: optionalText(4000),
  })
  .refine((value) => Boolean(value.titularEmail || value.titularPhone), {
    path: ["titularEmail"],
    // Sin forma de responder no se puede atender un derecho. La base tiene
    // el mismo CHECK: esto solo da un mensaje entendible antes de llegar.
    message: "Indica al menos un correo o un teléfono para poder responder.",
  });

export type PrivacyRequestCreateInput = z.infer<typeof privacyRequestCreateSchema>;

/**
 * Lo que se puede cambiar de un trámite abierto.
 *
 * Todo opcional, y al menos uno: un cuerpo vacío no es una edición y no debe
 * acabar escribiendo una línea de auditoría que no describe ningún cambio.
 * Es la misma regla que el parche de las imágenes del sitio.
 *
 * `receivedOn` NO está: la fecha de recibo es el hecho del que cuelga el
 * plazo legal, y permitir moverla sería permitir mover un vencimiento.
 */
export const privacyRequestPatchSchema = z
  .object({
    status: z.enum(PRIVACY_REQUEST_STATUSES).optional(),
    identityVerified: z.boolean().optional(),
    identityNote: optionalText(300),
    notes: optionalText(4000),
    response: optionalText(8000),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.identityVerified !== undefined ||
      value.identityNote !== undefined ||
      value.notes !== undefined ||
      value.response !== undefined,
    { message: "No hay nada que cambiar." },
  );

export type PrivacyRequestPatchInput = z.infer<typeof privacyRequestPatchSchema>;

const optionalFilter = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === "" ? undefined : value));

/** `abiertas` es la bandeja por defecto: es donde corre el plazo. */
export const PRIVACY_VIEWS = ["abiertas", "cerradas", "todas"] as const;

export type PrivacyView = (typeof PRIVACY_VIEWS)[number];

export const adminPrivacyQuerySchema = z.object({
  view: z.enum(PRIVACY_VIEWS).default("abiertas"),
  type: z.enum(PRIVACY_REQUEST_TYPES).optional(),
  status: z.enum(PRIVACY_REQUEST_STATUSES).optional(),
  channel: z.enum(PRIVACY_REQUEST_CHANNELS).optional(),
  q: optionalFilter(120),
  limit: z.coerce.number().int().min(1).max(200).default(25),
  page: z.coerce.number().int().min(1).default(1),
});

export type AdminPrivacyQuery = z.infer<typeof adminPrivacyQuerySchema>;
