import { z } from "zod";

/**
 * Parsea unos searchParams descartando SOLO lo que está mal.
 *
 * Antes, cualquier parámetro inválido hacía fallar el parse entero y la
 * página caía a los valores por defecto: `?publication=published&page=abc`
 * perdía también el filtro de publicación y mostraba el inventario completo
 * mientras la URL seguía diciendo que estaba filtrado. La pantalla y la
 * barra de direcciones se contradecían.
 *
 * Zod ya dice en qué campo falló, así que se quitan esos y se vuelve a
 * intentar. El bucle está acotado porque cada vuelta elimina al menos una
 * clave; el tope solo existe para que un schema con errores sin `path` no
 * pueda girar indefinidamente.
 */
export function parseTolerant<S extends z.ZodType>(
  schema: S,
  raw: Record<string, unknown>,
): z.infer<S> {
  const input: Record<string, unknown> = { ...raw };

  for (let attempt = 0; attempt <= Object.keys(input).length; attempt += 1) {
    const result = schema.safeParse(input);
    if (result.success) return result.data;

    const offending = new Set(
      result.error.issues
        .map((issue) => issue.path[0])
        .filter((key): key is string => typeof key === "string"),
    );

    // Un error sin campo señalado no se puede acotar: se cae a los defectos.
    if (offending.size === 0) break;
    for (const key of offending) delete input[key];
  }

  return schema.parse({});
}
