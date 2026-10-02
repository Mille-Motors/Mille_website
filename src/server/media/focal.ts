import { z } from "zod";

/**
 * La validación del encuadre, compartida por las dos superficies que lo
 * usan: las fotografías generales del sitio y las de los vehículos.
 *
 * Estaba definida dentro de `site-media/schemas.ts` cuando solo existía un
 * consumidor. Vive aquí desde que hay dos, porque un vehículo importando
 * esquemas de "site media" habría contado una historia falsa sobre la
 * relación entre las dos cosas: no comparten dominio, comparten
 * representación del encuadre.
 */

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
