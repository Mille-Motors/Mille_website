import Link from "next/link";
import { cn } from "@/lib/cn";
import { categoriesFor, categoryPlural } from "@/lib/categories";
import { inventoryHref, type InventoryFilters } from "@/lib/filters";
import type { VehicleCategory, VehicleType } from "@/types/vehicle";

/**
 * Categories read as editorial navigation rather than another dropdown.
 * Only the ones that actually have vehicles behind them are offered.
 *
 * Phones get a three-column grid, not a horizontal scroller: every option has
 * to be readable without discovering that the row slides.
 */
export function CategoryNav({
  filters,
  type,
  available,
}: {
  filters: InventoryFilters;
  type: VehicleType;
  /** Categories present in the visible inventory for this universe. */
  available: VehicleCategory[];
}) {
  const categories = categoriesFor(type).filter((c) => available.includes(c));
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
      key: category,
      label: categoryPlural[category],
      href: inventoryHref({ ...base, categoria: category }),
      active: filters.categoria === category,
    })),
  ];

  return (
    <nav aria-label={`Categorías de ${type === "moto" ? "motos" : "carros"}`}>
      <ul
        className={cn(
          // Grid on phones so nothing hides off-screen; an inline row from
          // tablet up, where it fits.
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
                // 48px of height on phones keeps the touch target comfortable.
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
