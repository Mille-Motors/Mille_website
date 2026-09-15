import "server-only";

import { revalidatePath } from "next/cache";
import { siteMediaRevalidationTarget } from "@/lib/site-media";

/**
 * Invalida las páginas que muestran estas fotografías.
 *
 * Todas son estáticas: `/`, `/contacto` y la página de error se prerenderizan
 * en el build. Sin esto, una fotografía nueva no aparece hasta el siguiente
 * despliegue — que es exactamente lo que pasaba con `/contacto`, porque esta
 * función se escribió cuando los cuatro slots vivían solo en la home y nadie
 * la amplió al añadir el quinto.
 *
 * Para que no vuelva a pasar, el destino ya no está escrito aquí: sale del
 * registro de slots (`siteMediaRevalidationTarget`). Añadir un slot en una
 * página nueva ajusta la invalidación solo.
 *
 * Hoy ese destino es el layout raíz, porque la página de error no tiene una
 * ruta que se pueda invalidar por separado e invalidar el layout cubre todo
 * lo que cuelga de él.
 */
export function revalidateSiteMedia(): void {
  const target = siteMediaRevalidationTarget();
  if (target.type) {
    revalidatePath(target.path, target.type);
    return;
  }
  revalidatePath(target.path);
}
