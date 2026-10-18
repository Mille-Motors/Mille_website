import { z } from "zod";
import {
  WHATSAPP_CLICK_INTENTS,
  WHATSAPP_CLICK_SOURCES,
} from "@/lib/whatsapp-click";

/**
 * Lo que acepta el endpoint del conteo de clics.
 *
 * Es el segundo endpoint que acepta escrituras anónimas, así que valida
 * estrecho: enums cerrados, un slug con la forma de un slug y una ruta que
 * empiece por `/`. No hay texto libre que pueda llenar la tabla de basura.
 */
export const whatsappClickSchema = z.object({
  source: z.enum(WHATSAPP_CLICK_SOURCES),
  intent: z.enum(WHATSAPP_CLICK_INTENTS).optional(),
  vehicleSlug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  path: z.string().trim().min(1).max(200).startsWith("/"),
});

export type WhatsappClickInput = z.infer<typeof whatsappClickSchema>;
