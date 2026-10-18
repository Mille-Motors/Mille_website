import Link from "next/link";
import { cn } from "@/lib/cn";
import { inventoryHref, type InventoryFilters } from "@/lib/filters";

/**
 * Las categorías se leen como navegación editorial y no como otro
 * desplegable. Solo se ofrecen las que tienen vehículos detrás: la lista
 * viene de las facetas del inventario visible, no de una tabla completa.
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
      <ul className="-mx-6 flex gap-1.5 overflow-x-auto px-6 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
        {entries.map((entry) => (
          <li key={entry.key} className="shrink-0">
            <Link
              href={entry.href}
              aria-current={entry.active ? "page" : undefined}
              className={cn(
                "press inline-flex min-h-11 items-center rounded-full px-4 text-[1.125rem]",
                entry.active
                  ? "bg-burgundy text-cream"
                  : "text-ink-soft hover:bg-ink/6 hover:text-ink",
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
