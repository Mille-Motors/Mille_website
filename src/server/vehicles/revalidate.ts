import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Qué hay que refrescar cuando el inventario cambia.
 *
 * El proyecto no usa Cache Components, así que las páginas públicas leen la
 * base en cada petición; esto invalida además el Full Route Cache para que
 * una ruta ya renderizada no siga sirviendo la versión anterior tras
 * publicar o despublicar.
 */
export function revalidateInventory(slug?: string | null): void {
  revalidatePath("/");
  revalidatePath("/vehiculos");
  revalidatePath("/contacto");
  if (slug) revalidatePath(`/vehiculos/${slug}`);
  else revalidatePath("/vehiculos/[slug]", "page");
}
