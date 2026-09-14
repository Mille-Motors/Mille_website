"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { scrollToInventory } from "@/components/vehicle/inventory-anchor";
import { inventoryHref, type InventoryFilters } from "@/lib/filters";
import { VEHICLE_TYPES, type VehicleType } from "@/types/vehicle";
import { typeLabel } from "@/lib/categories";

/**
 * The first decision of the page, and deliberately the loudest thing on it.
 * Whole inventory sits underneath at a much quieter weight.
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

  const handleClick = (type: VehicleType) => (event: MouseEvent<HTMLAnchorElement>) => {
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

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        {VEHICLE_TYPES.map((type) => {
          const active = filters.tipo === type;
          return (
            <Link
              key={type}
              // Switching universe drops category, make and the ranges: they
              // belong to the universe you are leaving.
              href={inventoryHref({ tipo: type, orden: filters.orden })}
              onClick={handleClick(type)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex flex-col justify-between gap-5 border px-5 py-5 transition-colors duration-200 sm:px-7 sm:py-6",
                active
                  ? "border-burgundy bg-burgundy text-cream"
                  : "border-stone bg-transparent text-ink hover:border-ink/45",
              )}
            >
              <span
                className={cn(
                  "label-caps self-end tabular",
                  active ? "text-cream/55" : "text-ink-muted",
                )}
              >
                {counts[type]}
              </span>
              <span className="font-display text-[clamp(1.75rem,4.2vw,2.75rem)] leading-none uppercase">
                {typeLabel[type]}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 flex justify-center">
        <Link
          href={inventoryHref({ tipo: "all", orden: filters.orden })}
          aria-current={filters.tipo === "all" ? "page" : undefined}
          className={cn(
            "label-caps inline-flex items-center gap-2.5 border-b py-1.5 transition-colors",
            filters.tipo === "all"
              ? "border-burgundy text-burgundy"
              : "border-transparent text-ink-muted hover:border-stone-strong hover:text-ink",
          )}
        >
          Ver todo el inventario
          <span className="tabular opacity-60">{counts.all}</span>
        </Link>
      </div>
    </div>
  );
}
