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

/** Solo el alt; la imagen se cambia subiendo un archivo. */
export const siteMediaPatchSchema = z.object({
  alt: siteMediaAltSchema,
});
