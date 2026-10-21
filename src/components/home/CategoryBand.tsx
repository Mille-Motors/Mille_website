import { CategoryTiles } from "@/components/home/CategoryTiles";
import { getBodyTypes } from "@/lib/vehicles";

/**
 * Un atajo por carrocería, en la sección oscura de la home: el boceto de la
 * categoría y su nombre, sobre un recuadro un tono más claro que el fondo.
 *
 * La lista NO está escrita aquí. Sale de las categorías activas de la base,
 * las mismas que ofrece el filtro de /vehiculos y que se administran en
 * /admin/categorias: si hay ocho carrocerías de carro, hay ocho aquí, con el
 * mismo nombre y en el mismo orden. Antes esta banda tenía su propia lista de
 * cinco y la coincidencia con el filtro dependía de que nadie tocara ninguna
 * de las dos.
 *
 * Cada una cae en una vista filtrada real. Una categoría sin vehículos hoy
 * lleva igual al inventario, que explica el vacío con su propia pantalla.
 */
export async function CategoryBand({ className }: { className?: string }) {
  return <CategoryTiles categories={await getBodyTypes()} className={className} />;
}
