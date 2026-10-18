"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { scrollToInventory } from "@/components/vehicle/inventory-anchor";
import { inventoryHref, type InventoryFilters } from "@/lib/filters";
import { typeLabel } from "@/lib/categories";

/**
 * La primera decisión de la página: todo el inventario, solo carros o solo
 * motos. Tres píldoras con su cuenta, la activa rellena.
 *
 * Plain links, not buttons: each view is a real URL, so this works with
 * middle-click, back/forward and sharing for free.
 *
 * Elegir universo baja al inventario. El caso sin resolver era que, tras
 * pulsar Carros, la respuesta quedaba fuera de pantalla: la elección estaba
 * hecha pero no se veía su consecuencia.
 *
 * El desplazamiento se dispara solo como consecuencia del clic, nunca por
 * llegar a la URL. Por eso el clic marca una intención en una ref y el
 * efecto solo actúa si la encuentra: entrar directamente a
 * /vehiculos?tipo=moto, recargar o volver con el botón del navegador
 * cambian el tipo igual, pero sin intención que consumir no mueven la
 * página. Se usa el mismo ancla que "Ver inventario", no otro sistema.
 */
type Universe = InventoryFilters["tipo"];

export function TypeSelector({
  filters,
  counts,
}: {
  filters: InventoryFilters;
  counts: { auto: number; moto: number; all: number };
}) {
  const requested = useRef(false);

  useEffect(() => {
    if (!requested.current) return;
    requested.current = false;
    scrollToInventory();
  }, [filters.tipo]);

  const handleClick = (type: Universe) => (event: MouseEvent<HTMLAnchorElement>) => {
    // Pulsar el universo que ya está puesto no debería navegar ni mover nada.
    if (filters.tipo === type) {
      event.preventDefault();
      return;
    }
    // Se respeta abrir en pestaña nueva: ahí no hay nada que desplazar aquí.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return;
    }
    requested.current = true;
  };

  const options: { type: Universe; label: string; count: number }[] = [
    { type: "all", label: "Todos", count: counts.all },
    { type: "auto", label: typeLabel.auto, count: counts.auto },
    { type: "moto", label: typeLabel.moto, count: counts.moto },
  ];

  return (
    <nav aria-label="Tipo de vehículo">
      <ul className="flex flex-wrap gap-2.5 sm:gap-3">
        {options.map(({ type, label, count }) => {
          const active = filters.tipo === type;
          return (
            <li key={type}>
              <Link
                // Switching universe drops category, make and the ranges: they
                // belong to the universe you are leaving.
                href={inventoryHref({ tipo: type, orden: filters.orden })}
                onClick={handleClick(type)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "press inline-flex min-h-12 items-center gap-2.5 rounded-full border px-5 text-[1.125rem] sm:px-6",
                  active
                    ? "border-ink bg-ink text-cream"
                    : "border-ink/25 text-ink hover:border-ink",
                )}
              >
                {label}
                <span className="tabular text-sm opacity-60">{count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
