import "server-only";

import { revalidatePath } from "next/cache";
import { revalidationTargetsFor } from "@/lib/site-media";

/**
 * Invalida lo que muestra la fotografía que se acaba de cambiar.
 *
 * La regla que esto cumple es una sola: guardar en el Admin y que la
 * SIGUIENTE petición pública vea el cambio, sin desplegar. Qué hay que
 * refrescar para cada espacio lo decide `revalidationTargetsFor`, que es
 * pura y está cubierta por pruebas; aquí solo se aplica.
 *
 * Lo que queda fuera de nuestro alcance es la caché de terceros: el
 * rastreador de WhatsApp o de Meta guarda su propia previsualización y la
 * renueva cuando le toca. Eso no es caché nuestra y no hay invalidación que
 * la alcance.
 */
export function revalidateSiteMedia(key?: string): void {
  for (const target of revalidationTargetsFor(key)) {
    if (target.type) revalidatePath(target.path, target.type);
    else revalidatePath(target.path);
  }
}
