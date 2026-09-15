import { z } from "zod";
import { isKnownSlot } from "@/lib/site-media";

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
 * Un eje del encuadre: un porcentaje real entre 0 y 100.
 *
 * `NaN` e `Infinity` se rechazan explícitamente porque `z.number()` los
 * aceptaría —en JavaScript son números— y llegarían a la base como un
 * encuadre que no significa nada. 0 y 100 sí son válidos: son los extremos
 * legítimos de la fotografía.
 */
export const focalAxisSchema = z
  .number()
  .refine(Number.isFinite, { message: "El encuadre debe ser un número." })
  .refine((value) => value >= 0 && value <= 100, {
    message: "El encuadre va de 0 a 100.",
  });

export const focalSchema = z.object({
  x: focalAxisSchema,
  y: focalAxisSchema,
});

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
