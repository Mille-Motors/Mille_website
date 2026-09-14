import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Los cuatro slots viven en la home, así que basta con invalidarla. Se hace
 * en su propio módulo para que el día que una de estas imágenes aparezca en
 * otra página, el sitio donde añadirla sea evidente.
 *
 * Esto es lo que permite cambiar una fotografía sin volver a desplegar.
 */
export function revalidateSiteMedia(): void {
  revalidatePath("/");
}
