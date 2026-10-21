"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { scrollToInventory } from "@/components/vehicle/inventory-anchor";
import { CategorySketch } from "@/components/vehicle/sketch";
import { inventoryHref, type InventoryFilters } from "@/lib/filters";

/**
 * La primera decisión de la página: cuatro ruedas o dos.
 *
 * Son dos mitades de un mismo control, cada una con su silueta, y la elegida
 * se rellena de vinotinto. Pulsar la que ya está elegida la suelta y vuelve al
 * inventario entero: no hay un tercer botón «Todos», porque «ninguna elegida»
 * ya es todo.
 *
 * Son enlaces y no botones: cada vista es una URL de verdad, así que funciona
 * con clic central, con atrás/adelante y compartiendo, sin estado aparte.
 *
 * Elegir un universo baja al inventario. El caso sin resolver era que, tras
 * pulsar, la respuesta quedaba fuera de pantalla: la elección estaba hecha
 * pero no se veía su consecuencia. El desplazamiento se dispara solo como
 * consecuencia del clic, nunca por llegar a la URL: entrar directamente a
 * /vehiculos?tipo=moto, recargar o volver con el botón del navegador cambian
 * el tipo igual, pero sin intención que consumir no mueven la página.
 *
 * Al cambiar de universo se sueltan la categoría, la marca y los rangos: son
 * del universo que se deja. Lo que se escribió en el buscador y el orden
 * sobreviven, porque no pertenecen a ninguno.
 */
type Universe = InventoryFilters["tipo"];

const options = [
  {
    type: "auto",
    label: "4 ruedas",
    sr: "carros",
    sketch: "sedan",
  },
  {
    type: "moto",
    label: "2 ruedas",
    sr: "motos",
    sketch: "sport",
  },
] as const;

export function TypeToggle({ filters }: { filters: InventoryFilters }) {
  const requested = useRef(false);

  useEffect(() => {
    if (!requested.current) return;
    requested.current = false;
    scrollToInventory();
  }, [filters.tipo]);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Se respeta abrir en pestaña nueva: ahí no hay nada que desplazar aquí.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return;
    }
    requested.current = true;
  };

  const hrefFor = (type: Universe) =>
    inventoryHref({ tipo: type, orden: filters.orden, q: filters.q });

  return (
    <nav aria-label="Tipo de vehículo">
      <ul className="grid grid-cols-2 gap-3">
        {options.map(({ type, label, sr, sketch }) => {
          const active = filters.tipo === type;
          return (
            <li key={type}>
              <Link
                // La elegida lleva de vuelta a «todo»; la otra, a su universo.
                href={hrefFor(active ? "all" : type)}
                onClick={handleClick}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "press flex h-14 items-center justify-center gap-3 rounded-full border text-[1.125rem] sm:h-16 sm:gap-4",
                  active
                    ? "border-burgundy bg-burgundy text-cream"
                    : "border-ink/12 bg-paper text-ink hover:border-ink/40",
                )}
              >
                <CategorySketch
                  slug={sketch}
                  vehicleType={type}
                  variant="mark"
                  // Vinotinto en reposo; elegida, la mitad se rellena de
                  // vinotinto y el trazo pasa a crema, que es lo que hereda.
                  className={cn("h-auto w-14 shrink-0 sm:w-16", !active && "text-burgundy")}
                />
                <span>
                  {label}
                  <span className="sr-only"> ({sr})</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
