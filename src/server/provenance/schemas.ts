import { z } from "zod";
import { IMAGE_SOURCE_TYPES } from "@/lib/image-provenance";

/**
 * Validación de la procedencia de una fotografía.
 *
 * `sourceType` es lo único obligatorio, y de ahí cuelga todo el diseño: es el
 * campo que convierte «no sabemos» en «lo sabemos». Exigir autor, licencia y
 * prueba para registrar que un propietario mandó las fotos por WhatsApp
 * garantizaría que nadie registrara nada, y una procedencia que nadie rellena
 * no documenta ninguna foto.
 */

const optionalText = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(max).nullable().optional(),
  );

/** Solo http(s): una URL `javascript:` en un panel del Admin es un XSS. */
const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .max(500)
    .refine((value) => /^https?:\/\//i.test(value), {
      message: "La URL debe empezar por http:// o https://",
    })
    .nullable()
    .optional(),
);

const optionalCivilDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Usa el formato AAAA-MM-DD." })
    .nullable()
    .optional(),
);

export const imageRightsSchema = z.object({
  sourceType: z.enum(IMAGE_SOURCE_TYPES),
  sourceName: optionalText(160),
  author: optionalText(160),
  sourceUrl: optionalUrl,
  licenseType: optionalText(160),
  licenseUrl: optionalUrl,
  licenseRequiresAttribution: z.boolean().default(false),
  acquiredOn: optionalCivilDate,
  authorizedBy: optionalText(160),
  proofRef: optionalText(300),
  notes: optionalText(2000),
});

export type ImageRightsInput = z.infer<typeof imageRightsSchema>;

/**
 * El cuerpo del endpoint de procedencia.
 *
 * `null` BORRA la procedencia registrada y devuelve la fotografía —o el
 * lote— al estado pendiente. Es una operación legítima y distinta de no
 * enviar nada: corregir un registro equivocado no puede obligar a inventar
 * otro, y dejarlo como estaba sería conservar un dato que se sabe falso.
 */
export const imageRightsPatchSchema = z.object({
  rights: imageRightsSchema.nullable(),
});

export type ImageRightsPatchInput = z.infer<typeof imageRightsPatchSchema>;
