"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Checkbox } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { EQUIPMENT_GROUPS } from "@/lib/equipment-catalog";

/**
 * Elegir equipamiento sobre un catálogo de más de ochenta elementos.
 *
 * Dos formas de llegar al mismo sitio, porque se usan en momentos
 * distintos: repasar un grupo entero cuando se está cargando un carro nuevo
 * con la ficha del fabricante delante, y buscar por nombre cuando se
 * recuerda algo suelto ("head-up") y no se sabe en qué grupo cayó.
 *
 * Al buscar desaparecen los grupos vacíos en vez de quedarse con el título
 * y nada debajo: la lista se acorta de verdad, que es para lo que se busca.
 */
export function EquipmentPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (keys: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const chosen = useMemo(() => new Set(selected), [selected]);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return EQUIPMENT_GROUPS;
    return EQUIPMENT_GROUPS.map((group) => ({
      ...group,
      features: group.features.filter((feature) =>
        feature.label.toLowerCase().includes(needle),
      ),
    })).filter((group) => group.features.length > 0);
  }, [query]);

  const toggle = (key: string) => {
    const next = new Set(chosen);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    // Se devuelve en el orden del catálogo y no en el de los clics: así dos
    // vehículos con el mismo equipamiento guardan exactamente lo mismo.
    onChange(
      EQUIPMENT_GROUPS.flatMap((group) =>
        group.features.map((feature) => feature.key),
      ).filter((key) => next.has(key)),
    );
  };

  return (
    <div>
      <div className="relative">
        <Search
          aria-hidden
          strokeWidth={1.5}
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar equipamiento…"
          aria-label="Buscar equipamiento"
          className="h-12 w-full rounded-xs border border-stone bg-paper pr-10 pl-11 text-sm text-ink transition-colors placeholder:text-ink-muted/70 hover:border-stone-strong focus:border-burgundy focus:outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpiar búsqueda"
            className="absolute top-1/2 right-3 inline-flex size-7 -translate-y-1/2 items-center justify-center text-ink-muted transition-colors hover:text-ink"
          >
            <X aria-hidden className="size-4" strokeWidth={1.5} />
          </button>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <p className="mt-6 font-serif text-[0.9375rem] text-ink-muted">
          Nada del catálogo coincide con «{query.trim()}». Si es una opción
          especial de esta unidad, añádela abajo en Equipamiento destacado.
        </p>
      ) : (
        <div className="mt-6 grid gap-7">
          {groups.map((group) => {
            const count = group.features.filter((f) => chosen.has(f.key)).length;
            return (
              <fieldset key={group.key}>
                <legend className="eyebrow mb-3 text-ink-muted">
                  {group.title}
                  {count > 0 ? (
                    <span className="ml-2 text-burgundy">{count}</span>
                  ) : null}
                </legend>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {group.features.map((feature) => (
                    <Checkbox
                      key={feature.key}
                      label={feature.label}
                      checked={chosen.has(feature.key)}
                      onChange={() => toggle(feature.key)}
                      className={cn(chosen.has(feature.key) && "text-ink")}
                    />
                  ))}
                </div>
              </fieldset>
            );
          })}
        </div>
      )}
    </div>
  );
}
