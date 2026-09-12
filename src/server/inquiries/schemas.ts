import { z } from "zod";
import { INQUIRY_STATUSES, INQUIRY_TYPES } from "@/types/vehicle";

/**
 * Validación de solicitudes del público. Es el único endpoint que acepta
 * escrituras de gente anónima, así que valida más de lo que parece
 * necesario y no confía en nada que venga del formulario.
 */

/**
 * Teléfonos colombianos e internacionales, escritos como la gente los
 * escribe: con espacios, guiones, paréntesis o un + delante. Se comprueba
 * que queden entre 7 y 15 dígitos reales.
 */
const phone = z
  .string()
  .trim()
  .min(7, { message: "Indica un teléfono válido." })
  .max(30)
  .refine((value) => /^[+]?[\d\s().-]+$/.test(value), {
    message: "Indica un teléfono válido.",
  })
  .refine(
    (value) => {
      const digits = value.replace(/\D/g, "").length;
      return digits >= 7 && digits <= 15;
    },
    { message: "Indica un teléfono válido." },
  );

export const inquiryInputSchema = z.object({
  type: z.enum(INQUIRY_TYPES),
  name: z
    .string()
    .trim()
    .min(2, { message: "Indica tu nombre." })
    .max(120),
  phone,
  email: z.email({ message: "Indica un correo válido." }).max(200),
  message: z.string().trim().max(2000).optional(),
  /** Slug del vehículo, no su id: el formulario público solo conoce slugs. */
  vehicleSlug: z.string().trim().max(120).optional(),
  source: z.string().trim().max(120).optional(),
  /**
   * Campo trampa. Es invisible y no tiene etiqueta, así que solo lo rellena
   * un bot que completa todos los inputs del formulario.
   */
  website: z.string().max(200).optional(),
});

export type InquiryInput = z.infer<typeof inquiryInputSchema>;

export const inquiryPatchSchema = z.object({
  status: z.enum(INQUIRY_STATUSES),
});

export const adminInquiryQuerySchema = z.object({
  status: z.enum(INQUIRY_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  page: z.coerce.number().int().min(1).default(1),
});
