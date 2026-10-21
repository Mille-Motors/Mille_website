import Link from "next/link";
import { CalendarCheck, Car, ChevronRight, FileText } from "lucide-react";
import { cn } from "@/lib/cn";
import type { InventoryStats } from "@/types/vehicle";

/**
 * Los cuatro números con los que arranca la pantalla de vehículos. Son del
 * inventario completo, no de lo que dejen los filtros: sirven para saber
 * dónde estás parado, y cada uno lleva a la lista que cuenta.
 *
 * Discretos a propósito: borde fino, sin sombra, una burbuja de color que
 * identifica el tipo de cifra. Lo que se lee primero es la tabla de abajo.
 */
export function VehicleStatStrip({ stats }: { stats: InventoryStats }) {
  const cards = [
    {
      label: "Total vehículos",
      value: stats.total,
      href: "/admin/vehiculos",
      bubble: "bg-burgundy/10 text-burgundy",
      icon: <Car aria-hidden className="size-5" strokeWidth={1.5} />,
    },
    {
      label: "Publicados",
      value: stats.published,
      href: "/admin/vehiculos?publication=published",
      bubble: "bg-status-available/12 text-status-available",
      icon: <span aria-hidden className="size-2.5 rounded-full bg-current" />,
    },
    {
      label: "Borradores",
      value: stats.draft,
      href: "/admin/vehiculos?publication=draft",
      bubble: "bg-draft-strong text-draft-ink",
      icon: <FileText aria-hidden className="size-5" strokeWidth={1.5} />,
    },
    {
      label: "Reservados",
      value: stats.reserved,
      href: "/admin/vehiculos?availability=reserved",
      bubble: "bg-burgundy/10 text-burgundy",
      icon: <CalendarCheck aria-hidden className="size-5" strokeWidth={1.5} />,
    },
  ];

  return (
    // Cuatro en fila solo cuando cada una conserva su rótulo entero; por
    // debajo de xl, dos por fila.
    <ul className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map((card) => (
        <li key={card.label}>
          <Link
            href={card.href}
            className="group flex items-center gap-2.5 rounded-xl border border-stone bg-paper px-3 py-3 transition-colors hover:border-stone-strong sm:gap-3.5 sm:px-4 sm:py-3.5"
          >
            <span
              className={cn(
                "inline-flex size-9 shrink-0 items-center justify-center rounded-full sm:size-11",
                card.bubble,
              )}
            >
              {card.icon}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm text-ink-muted sm:text-[0.9375rem]">
                {card.label}
              </span>
              <span className="mt-0.5 block text-[1.375rem] leading-none font-semibold text-ink tabular">
                {card.value}
              </span>
            </span>
            <ChevronRight
              aria-hidden
              strokeWidth={1.4}
              className="ml-auto hidden size-4 shrink-0 text-ink-muted transition-transform duration-200 group-hover:translate-x-0.5 sm:block"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
