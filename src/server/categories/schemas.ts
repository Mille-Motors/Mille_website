import { z } from "zod";
import { VEHICLE_TYPES } from "@/types/vehicle";

const trimmed = (max: number) => z.string().trim().max(max);

export const categoryInputSchema = z.object({
  name: trimmed(60).min(1, { message: "Indica el nombre." }),
  /** Cómo se lee en navegación: "Sedanes" para "Sedán". */
  pluralName: trimmed(60).optional(),
  /** Si no llega, se deriva del nombre. */
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "El slug solo admite minúsculas, números y guiones.",
    })
    .max(60)
    .optional(),
  vehicleType: z.enum(VEHICLE_TYPES),
  active: z.boolean().default(true),
  position: z.number().int().min(0).max(999).optional(),
});

export const categoryPatchSchema = categoryInputSchema.partial().omit({
  vehicleType: true,
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type CategoryPatch = z.infer<typeof categoryPatchSchema>;
