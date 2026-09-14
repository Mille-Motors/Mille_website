"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useDialog } from "@/components/ui/use-dialog";
import { typeLabel } from "@/lib/categories";
import { formatCOP } from "@/lib/format";
import {
  activeFilterCount,
  inventoryHref,
  priceLadder,
  sortLabels,
  SORT_KEYS,
  type InventoryFilters,
  type SortKey,
  type TypeFilter,
} from "@/lib/filters";
import type { InventoryFacets } from "@/lib/vehicles";

/**
 * The URL is the state. This component only computes the next URL and pushes
 * it; the server re-parses on arrival, so back, forward, refresh and a pasted
 * link all behave the same with no duplicated client state.
 */
type Patch = Partial<InventoryFilters>;

/** Compact price in millions, for option labels. */
function priceOptionLabel(value: number): string {
  return `${formatCOP(value / 1_000_000)} M`.replace("$ ", "$");
}

function Select({
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
  const active = value !== "";
  return (
    <div className={cn("relative", className)}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "label-caps h-10 w-full cursor-pointer appearance-none rounded-none border-0 border-b bg-transparent pr-7 pl-0 transition-colors",
          active
            ? "border-burgundy text-burgundy"
            : "border-stone-strong text-ink-soft hover:border-ink/50 hover:text-ink",
        )}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        strokeWidth={1.5}
        className={cn(
          "pointer-events-none absolute top-1/2 right-1 size-3.5 -translate-y-1/2",
          active ? "text-burgundy" : "text-ink-muted",
        )}
      />
    </div>
  );
}

/** A labelled pair of bounds: "Año 2019 — 2024". */
function RangeField({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="eyebrow mb-1.5 text-ink-muted/80">{legend}</legend>
      <div className="flex items-center gap-2">{children}</div>
    </fieldset>
  );
}

function FilterFields({
  value,
  facets,
  onChange,
  showType,
  className,
}: {
  value: InventoryFilters;
  facets: InventoryFacets;
  onChange: (patch: Patch) => void;
  showType: boolean;
  className?: string;
}) {
  const prices = priceLadder(facets.minPrice, facets.maxPrice);
  // A make can be filtering while having nothing in this universe (Carros +
  // KTM). Keep it in the list so the control shows what is actually applied
  // instead of claiming "Todas".
  const makes =
    value.marca && !facets.makes.includes(value.marca)
      ? [...facets.makes, value.marca].sort((a, b) => a.localeCompare(b, "es"))
      : facets.makes;

  return (
    <div className={className}>
      {showType ? (
        <RangeField legend="Tipo">
          <Select
            label="Tipo de vehículo"
            value={value.tipo === "all" ? "" : value.tipo}
            onChange={(v) =>
              onChange({
                tipo: (v || "all") as TypeFilter,
                // Category belongs to a universe; it cannot survive the move.
                categoria: undefined,
              })
            }
          >
            <option value="">Todos</option>
            <option value="auto">{typeLabel.auto}</option>
            <option value="moto">{typeLabel.moto}</option>
          </Select>
        </RangeField>
      ) : null}

      <RangeField legend="Marca">
        <Select
          label="Marca"
          value={value.marca ?? ""}
          onChange={(v) => onChange({ marca: v || undefined })}
        >
          <option value="">Todas</option>
          {makes.map((make) => (
            <option key={make} value={make}>
              {make}
            </option>
          ))}
        </Select>
      </RangeField>

      <RangeField legend="Año">
        <Select
          label="Año desde"
          value={value.minYear ? String(value.minYear) : ""}
          onChange={(v) => onChange({ minYear: v ? Number(v) : undefined })}
        >
          <option value="">Desde</option>
          {facets.years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </Select>
        <span aria-hidden className="text-ink-muted">
          –
        </span>
        <Select
          label="Año hasta"
          value={value.maxYear ? String(value.maxYear) : ""}
          onChange={(v) => onChange({ maxYear: v ? Number(v) : undefined })}
        >
          <option value="">Hasta</option>
          {facets.years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </Select>
      </RangeField>

      <RangeField legend="Precio">
        <Select
          label="Precio mínimo"
          value={value.minPrice ? String(value.minPrice) : ""}
          onChange={(v) => onChange({ minPrice: v ? Number(v) : undefined })}
        >
          <option value="">Desde</option>
          {prices.map((price) => (
            <option key={price} value={price}>
              {priceOptionLabel(price)}
            </option>
          ))}
        </Select>
        <span aria-hidden className="text-ink-muted">
          –
        </span>
        <Select
          label="Precio máximo"
          value={value.maxPrice ? String(value.maxPrice) : ""}
          onChange={(v) => onChange({ maxPrice: v ? Number(v) : undefined })}
        >
          <option value="">Hasta</option>
          {prices.map((price) => (
            <option key={price} value={price}>
              {priceOptionLabel(price)}
            </option>
          ))}
        </Select>
      </RangeField>
    </div>
  );
}

export function FilterBar({
  filters,
  facets,
}: {
  filters: InventoryFilters;
  facets: InventoryFacets;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  // The sheet batches edits so a phone does not navigate on every tap.
  const [draft, setDraft] = useState<InventoryFilters>(filters);
  const activeCount = activeFilterCount(filters);
  const showType = filters.tipo === "all";

  const go = (next: InventoryFilters) => {
    startTransition(() => router.push(inventoryHref(next), { scroll: false }));
  };

  const patch = (p: Patch) => go({ ...filters, ...p });

  const clearAll = () => {
    go({ tipo: filters.tipo, orden: filters.orden });
    setSheetOpen(false);
  };

  // Escape ya lo tenía; ahora también atrapa el foco y lo devuelve al cerrar.
  useDialog(sheetRef, sheetOpen, () => setSheetOpen(false));

  const sort = (
    <Select
      label="Ordenar"
      value={filters.orden === "recientes" ? "" : filters.orden}
      onChange={(v) => patch({ orden: (v || "recientes") as SortKey })}
      className="w-44"
    >
      {SORT_KEYS.map((key) => (
        <option key={key} value={key === "recientes" ? "" : key}>
          {sortLabels[key]}
        </option>
      ))}
    </Select>
  );

  return (
    <div className={cn("transition-opacity", pending && "opacity-60")} aria-busy={pending}>
      {/* Desktop: one editorial row of hairline controls. */}
      <div className="hidden items-end justify-between gap-10 lg:flex">
        <FilterFields
          value={filters}
          facets={facets}
          onChange={patch}
          showType={showType}
          className="flex flex-wrap items-end gap-x-8 gap-y-4"
        />
        <div className="shrink-0">
          <p className="eyebrow mb-1.5 text-ink-muted/80">Ordenar</p>
          {sort}
        </div>
      </div>

      {/* Below desktop: the fields move into a sheet, sort stays out. */}
      <div className="flex items-end justify-between gap-6 lg:hidden">
        <button
          type="button"
          onClick={() => {
            setDraft(filters);
            setSheetOpen(true);
          }}
          className="label-caps inline-flex h-10 items-center gap-2.5 border-b border-stone-strong text-ink"
        >
          <SlidersHorizontal aria-hidden className="size-4" strokeWidth={1.5} />
          Filtros
          {activeCount > 0 ? (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-burgundy text-[10px] text-cream">
              {activeCount}
            </span>
          ) : null}
        </button>
        <div className="min-w-0">
          <p className="eyebrow mb-1.5 text-right text-ink-muted/80">Ordenar</p>
          {sort}
        </div>
      </div>

      {activeCount > 0 ? (
        <ActiveChips
          filters={filters}
          facets={facets}
          onPatch={patch}
          onClear={clearAll}
        />
      ) : null}

      {sheetOpen ? (
        <div className="fixed inset-0 z-100 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar filtros"
            tabIndex={-1}
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-black/45"
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Filtros"
            // The bottom padding clears the iPhone home indicator so the
            // action row is never half under it.
            style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
            className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto overscroll-contain bg-cream"
          >
            <div className="flex items-center justify-between border-b border-stone px-5 py-4">
              <h2 className="font-display text-xl text-ink">Filtros</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Cerrar filtros"
                className="-mr-2 inline-flex size-10 items-center justify-center text-ink"
              >
                <X aria-hidden className="size-5" strokeWidth={1.25} />
              </button>
            </div>

            <FilterFields
              value={draft}
              facets={facets}
              onChange={(p) => setDraft((d) => ({ ...d, ...p }))}
              showType={showType}
              className="grid gap-6 px-5 py-7"
            />

            <div className="flex gap-3 px-5">
              <Button
                variant="ghost"
                size="lg"
                onClick={clearAll}
                className="flex-1"
              >
                Limpiar
              </Button>
              <Button
                size="lg"
                onClick={() => {
                  go(draft);
                  setSheetOpen(false);
                }}
                className="flex-1"
              >
                Aplicar filtros
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Active filters, as quiet removable text rather than SaaS pills. */
function ActiveChips({
  filters,
  facets,
  onPatch,
  onClear,
}: {
  filters: InventoryFilters;
  facets: InventoryFacets;
  onPatch: (patch: Patch) => void;
  onClear: () => void;
}) {
  const chips: { label: string; clear: Patch }[] = [];

  if (filters.marca) {
    chips.push({ label: filters.marca, clear: { marca: undefined } });
  }
  if (filters.categoria) {
    // La etiqueta sale de las facetas: las categorías ya no son un mapa fijo
    // en el código, y un slug suelto no es algo que nadie quiera leer.
    const category = facets.categories.find((c) => c.slug === filters.categoria);
    chips.push({
      label: category?.pluralName ?? filters.categoria,
      clear: { categoria: undefined },
    });
  }
  if (filters.minYear || filters.maxYear) {
    const label = filters.minYear && filters.maxYear
      ? `${filters.minYear}–${filters.maxYear}`
      : filters.minYear
        ? `Desde ${filters.minYear}`
        : `Hasta ${filters.maxYear}`;
    chips.push({ label, clear: { minYear: undefined, maxYear: undefined } });
  }
  if (filters.minPrice || filters.maxPrice) {
    const short = (v: number) => `$${v / 1_000_000} M`;
    const label = filters.minPrice && filters.maxPrice
      ? `${short(filters.minPrice)}–${short(filters.maxPrice)}`
      : filters.minPrice
        ? `Desde ${short(filters.minPrice)}`
        : `Hasta ${short(filters.maxPrice!)}`;
    chips.push({ label, clear: { minPrice: undefined, maxPrice: undefined } });
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2.5">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={() => onPatch(chip.clear)}
          className="label-caps inline-flex items-center gap-2 rounded-xs border border-stone px-2.5 py-1.5 text-[10px] text-ink-soft transition-colors hover:border-burgundy/50 hover:text-burgundy"
        >
          {chip.label}
          <X aria-hidden className="size-3" strokeWidth={1.6} />
          <span className="sr-only">Quitar filtro</span>
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="label-caps ml-1 text-[10px] text-ink-muted underline underline-offset-4 transition-colors hover:text-burgundy"
      >
        Limpiar todo
      </button>
    </div>
  );
}
