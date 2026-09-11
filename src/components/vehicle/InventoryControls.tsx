"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatCOP } from "@/lib/format";
import {
  PRICE_BUCKETS,
  type InventoryFilters,
  type SortKey,
  activeFilterCount,
  buildQuery,
  sortLabels,
  SORT_KEYS,
} from "@/lib/filters";
import { VEHICLE_CATEGORIES } from "@/types/vehicle";
import type { VehicleCategory } from "@/types/vehicle";

interface Facets {
  makes: string[];
  years: number[];
}

/** Bare select styled as an editorial control rather than a form input. */
function ControlSelect({
  label,
  value,
  onChange,
  children,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "label-caps h-11 w-full cursor-pointer appearance-none rounded-xs border bg-transparent pr-9 pl-4 text-ink transition-colors hover:border-stone-strong focus:border-burgundy focus:outline-none",
          value ? "border-burgundy/45 text-burgundy" : "border-stone",
        )}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        strokeWidth={1.5}
        className={cn(
          "pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2",
          value ? "text-burgundy" : "text-ink-muted",
        )}
      />
    </div>
  );
}

function FilterFields({
  filters,
  facets,
  update,
  className,
}: {
  filters: InventoryFilters;
  facets: Facets;
  update: (patch: Partial<InventoryFilters>) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <ControlSelect
        label="Categoría"
        value={filters.categoria ?? ""}
        onChange={(v) => update({ categoria: (v || undefined) as VehicleCategory })}
      >
        <option value="">Categoría</option>
        {VEHICLE_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </ControlSelect>

      <ControlSelect
        label="Marca"
        value={filters.marca ?? ""}
        onChange={(v) => update({ marca: v || undefined })}
      >
        <option value="">Marca</option>
        {facets.makes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </ControlSelect>

      <ControlSelect
        label="Año desde"
        value={filters.desde ? String(filters.desde) : ""}
        onChange={(v) => update({ desde: v ? Number(v) : undefined })}
      >
        <option value="">Año</option>
        {facets.years.map((y) => (
          <option key={y} value={y}>
            Desde {y}
          </option>
        ))}
      </ControlSelect>

      <ControlSelect
        label="Precio máximo"
        value={filters.hasta ? String(filters.hasta) : ""}
        onChange={(v) => update({ hasta: v ? Number(v) : undefined })}
      >
        <option value="">Precio</option>
        {PRICE_BUCKETS.map((p) => (
          <option key={p} value={p}>
            Hasta {formatCOP(p)}
          </option>
        ))}
      </ControlSelect>
    </div>
  );
}

export function InventoryControls({
  filters,
  facets,
  resultCount,
}: {
  filters: InventoryFilters;
  facets: Facets;
  resultCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeCount = activeFilterCount(filters);

  const update = (patch: Partial<InventoryFilters>) => {
    const next = { ...filters, ...patch };
    startTransition(() => router.push(`/vehiculos${buildQuery(next)}`, { scroll: false }));
  };

  const clearAll = () => {
    startTransition(() => router.push("/vehiculos", { scroll: false }));
    setDrawerOpen(false);
  };

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  return (
    <div
      className={cn(
        "border-y border-stone transition-opacity",
        pending && "opacity-60",
      )}
      aria-busy={pending}
    >
      {/* Desktop: everything inline. */}
      <div className="hidden items-center justify-between gap-4 py-4 lg:flex">
        <FilterFields
          filters={filters}
          facets={facets}
          update={update}
          className="flex flex-wrap items-center gap-3"
        />

        <div className="flex items-center gap-4">
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="label-caps inline-flex items-center gap-1.5 text-ink-muted transition-colors hover:text-burgundy"
            >
              <X aria-hidden className="size-3.5" strokeWidth={1.5} />
              Limpiar
            </button>
          ) : null}
          <ControlSelect
            label="Ordenar"
            value={filters.orden === "recientes" ? "" : filters.orden}
            onChange={(v) => update({ orden: (v || "recientes") as SortKey })}
            className="w-56"
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={key === "recientes" ? "" : key}>
                {sortLabels[key]}
              </option>
            ))}
          </ControlSelect>
        </div>
      </div>

      {/* Mobile: two buttons, filters behind a drawer. */}
      <div className="grid grid-cols-2 divide-x divide-stone lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="label-caps flex h-13 items-center justify-center gap-2.5 text-ink"
        >
          <SlidersHorizontal aria-hidden className="size-4" strokeWidth={1.5} />
          Filtros
          {activeCount > 0 ? (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-burgundy text-[10px] text-cream">
              {activeCount}
            </span>
          ) : null}
        </button>
        <div className="relative">
          <select
            aria-label="Ordenar"
            value={filters.orden}
            onChange={(e) => update({ orden: e.target.value as SortKey })}
            className="label-caps h-13 w-full cursor-pointer appearance-none bg-transparent px-4 text-center text-ink focus:outline-none"
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {sortLabels[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-100 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar filtros"
            tabIndex={-1}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto bg-cream pb-8">
            <div className="flex items-center justify-between border-b border-stone px-5 py-4">
              <h2 className="font-display text-xl text-ink">Filtros</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar filtros"
                className="-mr-2 inline-flex size-10 items-center justify-center text-ink"
              >
                <X aria-hidden className="size-5" strokeWidth={1.25} />
              </button>
            </div>

            <FilterFields
              filters={filters}
              facets={facets}
              update={update}
              className="grid gap-3 px-5 py-6"
            />

            <div className="flex gap-3 px-5">
              {activeCount > 0 ? (
                <Button variant="ghost" size="lg" onClick={clearAll} className="flex-1">
                  Limpiar
                </Button>
              ) : null}
              <Button size="lg" onClick={() => setDrawerOpen(false)} className="flex-1">
                Ver {resultCount} {resultCount === 1 ? "vehículo" : "vehículos"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
