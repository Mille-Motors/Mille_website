import { z } from "zod";
import { isKnownSlot } from "@/lib/site-media";
// El encuadre lo comparten site media y las fotos de vehículos: una sola
// definición, en `server/media`.
import { focalSchema } from "@/server/media/focal";

export { focalAxisSchema, focalSchema } from "@/server/media/focal";

/**
 * La clave tiene que ser una de las definidas en el código. No se acepta
 * texto arbitrario: eso convertiría la tabla en un CMS improvisado y dejaría
 * que alguien escribiera filas que ninguna página lee.
 */
export const siteMediaKeySchema = z
  .string()
  .trim()
  .max(60)
  .refine(isKnownSlot, { message: "Ese slot no existe." });

export const siteMediaAltSchema = z
  .string()
  .trim()
  .min(3, { message: "Escribe un texto alternativo." })
  .max(300);

/**
 * Lo que se puede cambiar sin volver a subir el archivo: el texto alternativo
 * y el encuadre, juntos o por separado. Se exige al menos uno para que un
 * cuerpo vacío no cuente como una edición y acabe escribiendo una entrada de
 * auditoría que no describe ningún cambio.
 */
export const siteMediaPatchSchema = z
  .object({
    alt: siteMediaAltSchema.optional(),
    focal: focalSchema.optional(),
  })
  .refine((value) => value.alt !== undefined || value.focal !== undefined, {
    message: "No hay nada que cambiar.",
  });
