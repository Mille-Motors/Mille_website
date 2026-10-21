import Link from "next/link";
import { cn } from "@/lib/cn";
import { inventoryHref, type InventoryFilters } from "@/lib/filters";

/**
 * Las categorías se leen como una fila de píldoras: «Todos», y después cada
 * carrocería del universo elegido.
 *
 * La lista es la de la base, la misma que la portada y el admin: aparecen
 * todas, tengan o no vehículos hoy. Antes solo salían las que tenían stock, y
 * eso hacía que la portada prometiera ocho carrocerías y el filtro enseñara
 * tres. Las que hoy no tienen ninguno se atenúan, para que se vea de un
 * vistazo, pero siguen siendo enlaces: la pantalla de «no hay» ofrece
 * contarnos qué se busca, que es mejor respuesta que un botón muerto.
 *
 * Elegir una no suelta lo demás. Antes cada píldora conservaba solo el
 * universo, la marca y el orden, y quien había escrito una búsqueda o puesto
 * un precio los perdía al tocar «Camionetas» sin que nada se lo dijera. Aquí
 * solo cambia la categoría.
 *
 * En teléfono es una fila que se desliza hacia un lado y llega hasta el borde
 * de la pantalla, de modo que el corte de la última opción avisa de que hay
 * más; desde tablet cabe entera y salta de línea si hace falta.
 */
export interface CategoryOption {
  id: string;
  name: string;
  pluralName: string;
  slug: string;
  /** Vehículos publicados hoy. Sin ninguno, la píldora se atenúa. */
  count: number;
}

const pill =
  "inline-flex min-h-11 items-center rounded-full border px-5 text-base";

export function CategoryNav({
  filters,
  categories,
}: {
  filters: InventoryFilters;
  /** La taxonomía activa del universo, con la cuenta de cada categoría. */
  categories: CategoryOption[];
}) {
  if (categories.length === 0) return null;

  return (
    <nav
      aria-label={`Categorías de ${filters.tipo === "moto" ? "motos" : "carros"}`}
    >
      {/* `relative`: el texto solo para lectores de pantalla es absoluto, y sin
          un ancestro posicionado se escapa de la fila que se desliza y ensancha
          la página entera por el lado. */}
      <ul className="relative -mx-6 flex gap-2.5 overflow-x-auto px-6 py-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
        <li className="shrink-0">
          <Link
            href={inventoryHref({ ...filters, categoria: undefined })}
            // No hace falta bajar al inventario: ya se está en él.
            scroll={false}
            aria-current={!filters.categoria ? "page" : undefined}
            className={cn(
              "press",
              pill,
              !filters.categoria
                ? "border-burgundy bg-burgundy text-cream"
                : "border-ink/15 bg-paper text-ink-soft hover:border-ink/40 hover:text-ink",
            )}
          >
            Todos
          </Link>
        </li>

        {categories.map((category) => {
          const active = filters.categoria === category.slug;
          return (
            <li key={category.id} className="shrink-0">
              <Link
                href={inventoryHref({ ...filters, categoria: category.slug })}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "press",
                  pill,
                  active
                    ? "border-burgundy bg-burgundy text-cream"
                    : category.count === 0
                      ? // Sin vehículos hoy: se ve, y se puede pulsar, pero
                        // dice a primera vista que no hay nada.
                        "border-ink/10 bg-transparent text-ink-muted/70 hover:border-ink/30 hover:text-ink-soft"
                      : "border-ink/15 bg-paper text-ink-soft hover:border-ink/40 hover:text-ink",
                )}
              >
                {category.pluralName}
                {category.count === 0 && !active ? (
                  <span className="sr-only"> (sin vehículos por ahora)</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
