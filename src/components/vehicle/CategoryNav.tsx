import Link from "next/link";
import { cn } from "@/lib/cn";
import { inventoryHref, type InventoryFilters } from "@/lib/filters";

/**
 * Las categorías se leen como navegación editorial y no como otro
 * desplegable. Solo se ofrecen las que tienen vehículos detrás: la lista
 * viene de las facetas del inventario visible, no de una tabla completa.
 *
 * En teléfono se dibuja como rejilla de tres columnas y no como carrusel:
 * todas las opciones tienen que leerse sin descubrir que la fila se desliza.
 */
export interface CategoryOption {
  id: string;
  name: string;
  pluralName: string;
  slug: string;
}

export function CategoryNav({
  filters,
  categories,
}: {
  filters: InventoryFilters;
  /** Categorías presentes en el inventario visible de este universo. */
  categories: CategoryOption[];
}) {
  if (categories.length === 0) return null;

  const base = { tipo: filters.tipo, marca: filters.marca, orden: filters.orden };

  const entries: { key: string; label: string; href: string; active: boolean }[] = [
    {
      key: "all",
      label: "Todas",
      href: inventoryHref({ ...base, categoria: undefined }),
      active: !filters.categoria,
    },
    ...categories.map((category) => ({
      key: category.id,
      label: category.pluralName,
      href: inventoryHref({ ...base, categoria: category.slug }),
      active: filters.categoria === category.slug,
    })),
  ];

  return (
    <nav
      aria-label={`Categorías de ${filters.tipo === "moto" ? "motos" : "carros"}`}
    >
      <ul
        className={cn(
          // Rejilla en teléfono para que nada quede fuera de pantalla; fila
          // en línea desde tablet, donde sí cabe.
          "grid grid-cols-3 border-t border-l border-stone",
          "sm:flex sm:flex-wrap sm:gap-x-9 sm:border-0",
        )}
      >
        {entries.map((entry) => (
          <li
            key={entry.key}
            className="border-r border-b border-stone sm:border-0"
          >
            <Link
              href={entry.href}
              aria-current={entry.active ? "page" : undefined}
              className={cn(
                // 48px de alto en teléfono mantiene el objetivo táctil cómodo.
                "flex h-12 items-center justify-center px-2 text-center font-serif text-[0.875rem] transition-colors",
                "sm:h-auto sm:justify-start sm:border-b-2 sm:px-0 sm:py-2 sm:text-base",
                entry.active
                  ? "bg-burgundy text-cream sm:border-burgundy sm:bg-transparent sm:text-ink"
                  : "text-ink-soft hover:bg-sand/60 sm:border-transparent sm:hover:bg-transparent sm:hover:text-ink",
              )}
            >
              {entry.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
