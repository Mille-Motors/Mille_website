"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useDialog } from "@/components/ui/use-dialog";
import { typeLabel } from "@/lib/categories";
import { formatCOP, formatInteger } from "@/lib/format";
import {
  activeFilterCount,
  clearedFilters,
  inventoryHref,
  mileageLadder,
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
 *
 * La taxonomía nueva añadió carrocería, modelo, combustible, transmisión,
 * tracción, kilometraje, ciudad y carácter. Once controles siempre a la
 * vista convertirían el inventario en una hoja de cálculo, así que en
 * escritorio solo están los cinco con los que alguien empieza a buscar y el
 * resto vive detrás de "Más filtros". En teléfono todos caben en la hoja,
 * que ya se abre a propósito. Los dos caminos escriben en la misma URL: no
 * hay dos estados que puedan discrepar.
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

/** Un desplegable de "Todas / una de estas", que es la forma de casi todos. */
function ChoiceField({
  legend,
  label,
  all,
  value,
  options,
  onChange,
}: {
  legend: string;
  label: string;
  /** "Todas" o "Todos", según el género de lo que se filtra. */
  all: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (value: string | undefined) => void;
}) {
  return (
    <RangeField legend={legend}>
      <Select
        label={label}
        value={value ?? ""}
        onChange={(v) => onChange(v || undefined)}
      >
        <option value="">{all}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </RangeField>
  );
}

const plain = (values: string[]) =>
  values.map((value) => ({ value, label: value }));

interface FieldsProps {
  value: InventoryFilters;
  facets: InventoryFacets;
  onChange: (patch: Patch) => void;
  showType: boolean;
  className?: string;
}

/**
 * Con qué empieza alguien que busca un carro: qué universo, qué carrocería,
 * qué marca, de qué años y por cuánto dinero.
 */
function PrimaryFields({
  value,
  facets,
  onChange,
  showType,
  className,
}: FieldsProps) {
  const prices = priceLadder(facets.minPrice, facets.maxPrice);

  // Una marca puede estar filtrando sin existir en este universo (Carros +
  // KTM). Se conserva en la lista para que el control muestre lo que está
  // aplicado de verdad en vez de decir "Todas".
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
                // La carrocería pertenece a un universo: no sobrevive al salto.
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

      {/* Carrocería. Es el mismo `?categoria=` que la navegación de arriba,
          no un filtro paralelo: los dos escriben en la URL, así que no
          pueden desincronizarse. Aquí importa sobre todo en teléfono y en la
          vista "Todos", donde esa navegación no se dibuja. */}
      {facets.categories.length > 0 ? (
        <ChoiceField
          legend="Carrocería"
          label="Carrocería"
          all="Todas"
          value={value.categoria}
          options={facets.categories.map((category) => ({
            value: category.slug,
            label: category.pluralName,
          }))}
          onChange={(categoria) => onChange({ categoria })}
        />
      ) : null}

      <ChoiceField
        legend="Marca"
        label="Marca"
        all="Todas"
        value={value.marca}
        options={plain(makes)}
        // Cambiar de marca invalida el modelo elegido: un "Serie 3" con
        // marca Audi daría cero y no se vería por qué.
        onChange={(marca) => onChange({ marca, modelo: undefined })}
      />

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

/**
 * Lo que se afina después.
 *
 * Cada control aparece solo si el inventario visible ofrece más de una
 * opción: un desplegable de "Transmisión" con una sola entrada no filtra
 * nada, y ofrecerlo hace creer que sí.
 */
function SecondaryFields({ value, facets, onChange, className }: FieldsProps) {
  const mileages = mileageLadder(facets.maxMileage);

  // Sin marca elegida, el modelo se lee con su marca delante: "Serie 3" y
  // "Clase C" sueltos en la misma lista no se distinguen.
  const models = value.marca
    ? facets.models.filter((m) => m.make === value.marca)
    : facets.models;
  const modelOptions = models.map((m) => ({
    value: m.model,
    label: value.marca ? m.model : `${m.make} ${m.model}`,
  }));

  return (
    <div className={className}>
      {modelOptions.length > 1 ? (
        <ChoiceField
          legend="Modelo"
          label="Modelo"
          all="Todos"
          value={value.modelo}
          options={modelOptions}
          onChange={(modelo) => onChange({ modelo })}
        />
      ) : null}

      {facets.fuelTypes.length > 1 ? (
        <ChoiceField
          legend="Combustible"
          label="Combustible"
          all="Todos"
          value={value.combustible}
          options={plain(facets.fuelTypes)}
          onChange={(combustible) => onChange({ combustible })}
        />
      ) : null}

      {facets.transmissions.length > 1 ? (
        <ChoiceField
          legend="Transmisión"
          label="Transmisión"
          all="Todas"
          value={value.transmision}
          options={plain(facets.transmissions)}
          onChange={(transmision) => onChange({ transmision })}
        />
      ) : null}

      {facets.drivetrains.length > 1 ? (
        <ChoiceField
          legend="Tracción"
          label="Tracción"
          all="Todas"
          value={value.traccion}
          options={plain(facets.drivetrains)}
          onChange={(traccion) => onChange({ traccion })}
        />
      ) : null}

      {mileages.length > 0 ? (
        <ChoiceField
          legend="Kilometraje"
          label="Kilometraje máximo"
          all="Sin tope"
          value={value.maxKm ? String(value.maxKm) : undefined}
          options={mileages.map((km) => ({
            value: String(km),
            label: `Hasta ${formatInteger(km)} km`,
          }))}
          onChange={(maxKm) => onChange({ maxKm: maxKm ? Number(maxKm) : undefined })}
        />
      ) : null}

      {facets.cities.length > 1 ? (
        <ChoiceField
          legend="Ciudad"
          label="Ciudad"
          all="Todas"
          value={value.ciudad}
          options={plain(facets.cities)}
          onChange={(ciudad) => onChange({ ciudad })}
        />
      ) : null}

      {/* Carácter, no carrocería. "Deportivo" vive aquí precisamente porque
          un M3 es un sedán deportivo y un Golf GTI un hatchback deportivo. */}
      {facets.tags.length > 0 ? (
        <ChoiceField
          legend="Carácter"
          label="Carácter del vehículo"
          all="Todos"
          value={value.etiqueta}
          options={plain(facets.tags)}
          onChange={(etiqueta) => onChange({ etiqueta })}
        />
      ) : null}
    </div>
  );
}

/** ¿Hay algún filtro secundario puesto? Decide si el panel nace abierto. */
function hasSecondary(filters: InventoryFilters): boolean {
  return [
    filters.modelo,
    filters.combustible,
    filters.transmision,
    filters.traccion,
    filters.ciudad,
    filters.etiqueta,
    filters.maxKm,
  ].some((value) => value !== undefined);
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
  // Llegar con un enlace que ya trae un filtro afinado tiene que enseñarlo:
  // esconderlo detrás de "Más filtros" haría creer que no está puesto.
  const [moreOpen, setMoreOpen] = useState(() => hasSecondary(filters));
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
    go(clearedFilters(filters));
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

  const fieldProps = {
    value: filters,
    facets,
    onChange: patch,
    showType,
  };

  return (
    <div className={cn("transition-opacity", pending && "opacity-60")} aria-busy={pending}>
      {/* Desktop: one editorial row of hairline controls. */}
      <div className="hidden lg:block">
        <div className="flex items-end justify-between gap-10">
          <PrimaryFields
            {...fieldProps}
            className="flex flex-wrap items-end gap-x-8 gap-y-4"
          />
          <div className="shrink-0">
            <p className="eyebrow mb-1.5 text-ink-muted/80">Ordenar</p>
            {sort}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          className="label-caps mt-5 inline-flex items-center gap-2 text-ink-muted transition-colors hover:text-burgundy"
        >
          {moreOpen ? "Menos filtros" : "Más filtros"}
          <ChevronDown
            aria-hidden
            strokeWidth={1.5}
            className={cn("size-3.5 transition-transform", moreOpen && "rotate-180")}
          />
        </button>

        {moreOpen ? (
          <SecondaryFields
            {...fieldProps}
            className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-4 border-t border-stone pt-5"
          />
        ) : null}
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
            <div className="sticky top-0 flex items-center justify-between border-b border-stone bg-cream px-5 py-4">
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

            {/* La hoja edita un borrador y solo navega al aplicar: en
                teléfono, recargar la rejilla en cada toque es insufrible. */}
            <PrimaryFields
              value={draft}
              facets={facets}
              onChange={(p) => setDraft((d) => ({ ...d, ...p }))}
              showType={showType}
              className="grid gap-6 px-5 pt-7 pb-6"
            />
            <SecondaryFields
              value={draft}
              facets={facets}
              onChange={(p) => setDraft((d) => ({ ...d, ...p }))}
              showType={showType}
              className="grid gap-6 border-t border-stone px-5 py-6"
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

/**
 * Active filters, as quiet removable text rather than SaaS pills.
 *
 * Cada filtro puesto tiene su ficha y su forma de quitarse. Con once filtros
 * posibles esto dejó de ser un adorno: es lo único que responde "¿por qué
 * veo tan pocos carros?" sin obligar a abrir el panel y repasarlo entero.
 */
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
  const chips: { key: string; label: string; clear: Patch }[] = [];

  if (filters.categoria) {
    // La etiqueta sale de las facetas: las carrocerías son filas
    // administrables y un slug suelto no es algo que nadie quiera leer.
    const category = facets.categories.find((c) => c.slug === filters.categoria);
    chips.push({
      key: "categoria",
      label: category?.pluralName ?? filters.categoria,
      clear: { categoria: undefined },
    });
  }
  if (filters.marca) {
    chips.push({
      key: "marca",
      label: filters.marca,
      clear: { marca: undefined, modelo: undefined },
    });
  }
  if (filters.modelo) {
    chips.push({ key: "modelo", label: filters.modelo, clear: { modelo: undefined } });
  }
  if (filters.combustible) {
    chips.push({
      key: "combustible",
      label: filters.combustible,
      clear: { combustible: undefined },
    });
  }
  if (filters.transmision) {
    chips.push({
      key: "transmision",
      label: filters.transmision,
      clear: { transmision: undefined },
    });
  }
  if (filters.traccion) {
    chips.push({
      key: "traccion",
      label: filters.traccion,
      clear: { traccion: undefined },
    });
  }
  if (filters.ciudad) {
    chips.push({ key: "ciudad", label: filters.ciudad, clear: { ciudad: undefined } });
  }
  if (filters.etiqueta) {
    chips.push({
      key: "etiqueta",
      label: filters.etiqueta,
      clear: { etiqueta: undefined },
    });
  }
  if (filters.minYear || filters.maxYear) {
    const label = filters.minYear && filters.maxYear
      ? `${filters.minYear}–${filters.maxYear}`
      : filters.minYear
        ? `Desde ${filters.minYear}`
        : `Hasta ${filters.maxYear}`;
    chips.push({
      key: "anio",
      label,
      clear: { minYear: undefined, maxYear: undefined },
    });
  }
  if (filters.minPrice || filters.maxPrice) {
    const short = (v: number) => `$${v / 1_000_000} M`;
    const label = filters.minPrice && filters.maxPrice
      ? `${short(filters.minPrice)}–${short(filters.maxPrice)}`
      : filters.minPrice
        ? `Desde ${short(filters.minPrice)}`
        : `Hasta ${short(filters.maxPrice!)}`;
    chips.push({
      key: "precio",
      label,
      clear: { minPrice: undefined, maxPrice: undefined },
    });
  }
  if (filters.maxKm) {
    chips.push({
      key: "maxKm",
      label: `Hasta ${formatInteger(filters.maxKm)} km`,
      clear: { maxKm: undefined },
    });
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2.5">
      {chips.map((chip) => (
        <button
          key={chip.key}
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
