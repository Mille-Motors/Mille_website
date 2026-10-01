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
  DRIVETRAINS,
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_TAGS,
} from "@/types/vehicle";
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
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  /** Sin nada que elegir. Conserva el filete y el alto; pierde el hover. */
  disabled?: boolean;
}) {
  const active = value !== "";
  return (
    <div className={cn("relative", className)}>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "label-caps h-10 w-full appearance-none rounded-none border-0 border-b bg-transparent pr-7 pl-0 transition-colors",
          disabled
            ? "cursor-not-allowed border-stone text-ink-muted/70"
            : "cursor-pointer",
          !disabled &&
            (active
              ? "border-burgundy text-burgundy"
              : "border-stone-strong text-ink-soft hover:border-ink/50 hover:text-ink"),
        )}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        strokeWidth={1.5}
        className={cn(
          "pointer-events-none absolute top-1/2 right-1 size-3.5 -translate-y-1/2",
          disabled
            ? "text-ink-muted/40"
            : active
              ? "text-burgundy"
              : "text-ink-muted",
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

/**
 * Un desplegable de "Todas / una de estas", que es la forma de casi todos.
 *
 * Sin opciones no desaparece: se queda deshabilitado diciendo qué falta.
 * Esconderlo dejaba el panel de "Más filtros" vacío con el inventario en
 * cero, que se lee como una pantalla rota y no como un inventario vacío.
 */
function ChoiceField({
  legend,
  label,
  all,
  empty,
  value,
  options,
  onChange,
}: {
  legend: string;
  label: string;
  /** "Todas" o "Todos", según el género de lo que se filtra. */
  all: string;
  /** Qué se lee cuando todavía no hay nada que elegir. */
  empty: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (value: string | undefined) => void;
}) {
  const disabled = options.length === 0;
  return (
    <RangeField legend={legend}>
      <Select
        label={label}
        value={value ?? ""}
        disabled={disabled}
        onChange={(v) => onChange(v || undefined)}
      >
        <option value="">{disabled ? empty : all}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </RangeField>
  );
}

/**
 * Un rango —año, precio— que todavía no tiene datos detrás.
 *
 * Se dibuja como un solo control inerte en vez de como dos "Desde/Hasta"
 * muertos: la estructura, el filete y el epígrafe siguen ahí, pero no se
 * inventa un rango a partir de un mínimo y un máximo que valen cero.
 */
function EmptyRange({ legend, label }: { legend: string; label: string }) {
  return (
    <RangeField legend={legend}>
      <Select label={legend} value="" disabled onChange={() => {}}>
        <option value="">{label}</option>
      </Select>
    </RangeField>
  );
}

const plain = (values: string[]) =>
  values.map((value) => ({ value, label: value }));

/**
 * Lo que existe en el inventario, o el vocabulario entero si no existe nada.
 *
 * Combustible, transmisión, tracción y carácter tienen un conjunto de
 * valores conocido de antemano (`src/types/vehicle.ts`), así que su control
 * no depende de que haya stock para poder dibujarse. Mientras haya
 * inventario se sigue ofreciendo solo lo que existe —prometer "Diésel"
 * cuando MILLE no tiene ninguno es prometer un cero—; cuando no lo hay, la
 * lista completa es lo que explica qué se podrá filtrar.
 */
function presentOrVocabulary(
  present: string[],
  vocabulary: readonly string[],
): string[] {
  return present.length > 0 ? present : [...vocabulary];
}

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

  // La carrocería es taxonomía administrable: sin inventario se ofrece la
  // que está activa en la base, que sigue siendo verdad aunque no cuelgue
  // ningún vehículo de ella.
  const bodies =
    facets.categories.length > 0 ? facets.categories : facets.allCategories;

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
      <ChoiceField
        legend="Carrocería"
        label="Carrocería"
        all="Todas"
        empty="Sin carrocerías definidas"
        value={value.categoria}
        options={bodies.map((category) => ({
          value: category.slug,
          label: category.pluralName,
        }))}
        onChange={(categoria) => onChange({ categoria })}
      />

      <ChoiceField
        legend="Marca"
        label="Marca"
        all="Todas"
        // La marca sí depende del inventario: no hay una lista de marcas
        // conocida de antemano y nombrar una que MILLE no ha tenido nunca
        // sería inventarla.
        empty="Sin marcas todavía"
        value={value.marca}
        options={plain(makes)}
        // Cambiar de marca invalida el modelo elegido: un "Serie 3" con
        // marca Audi daría cero y no se vería por qué.
        onChange={(marca) => onChange({ marca, modelo: undefined })}
      />

      {facets.years.length > 0 ? (
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
      ) : (
        <EmptyRange legend="Año" label="Sin años todavía" />
      )}

      {prices.length > 0 ? (
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
      ) : (
        // Con el inventario vacío, `minPrice` y `maxPrice` son 0 y la
        // escalera sale vacía. No se inventa un rango: no hay precios que
        // describir.
        <EmptyRange legend="Precio" label="Sin precios todavía" />
      )}
    </div>
  );
}

/**
 * Lo que se afina después.
 *
 * Todos los controles se dibujan siempre. Antes se escondían los que
 * ofrecían menos de dos opciones —con la idea de no ofrecer un filtro que
 * no filtra nada— y con el inventario en cero eso dejaba el panel de "Más
 * filtros" completamente vacío: se abría y no había nada dentro, que no se
 * lee como "todavía no hay stock" sino como una pantalla rota.
 *
 * Ahora la ausencia se dice, no se esconde: los que tienen vocabulario
 * conocido caen a la lista completa y los que dependen de los datos se
 * quedan deshabilitados explicando qué falta.
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
      <ChoiceField
        legend="Modelo"
        label="Modelo"
        all="Todos"
        empty={
          // Dos ausencias distintas, y se distinguen: con una marca elegida
          // que no tiene modelos, el problema es esa marca; sin marca, es
          // que no hay inventario del que sacarlos.
          value.marca ? "Sin modelos de esa marca" : "Sin modelos todavía"
        }
        value={value.modelo}
        options={modelOptions}
        onChange={(modelo) => onChange({ modelo })}
      />

      <ChoiceField
        legend="Combustible"
        label="Combustible"
        all="Todos"
        empty="Sin combustibles"
        value={value.combustible}
        options={plain(presentOrVocabulary(facets.fuelTypes, FUEL_TYPES))}
        onChange={(combustible) => onChange({ combustible })}
      />

      <ChoiceField
        legend="Transmisión"
        label="Transmisión"
        all="Todas"
        empty="Sin transmisiones"
        value={value.transmision}
        options={plain(presentOrVocabulary(facets.transmissions, TRANSMISSIONS))}
        onChange={(transmision) => onChange({ transmision })}
      />

      <ChoiceField
        legend="Tracción"
        label="Tracción"
        all="Todas"
        empty="Sin tracciones"
        value={value.traccion}
        options={plain(presentOrVocabulary(facets.drivetrains, DRIVETRAINS))}
        onChange={(traccion) => onChange({ traccion })}
      />

      {mileages.length > 0 ? (
        <ChoiceField
          legend="Kilometraje"
          label="Kilometraje máximo"
          all="Sin tope"
          empty="Sin kilometrajes todavía"
          value={value.maxKm ? String(value.maxKm) : undefined}
          options={mileages.map((km) => ({
            value: String(km),
            label: `Hasta ${formatInteger(km)} km`,
          }))}
          onChange={(maxKm) =>
            onChange({ maxKm: maxKm ? Number(maxKm) : undefined })
          }
        />
      ) : (
        // La escalera se recorta al inventario para no ofrecer un tope que
        // incluya a todos. Sin inventario no hay nada a lo que recortarla.
        <EmptyRange legend="Kilometraje" label="Sin kilometrajes todavía" />
      )}

      <ChoiceField
        legend="Ciudad"
        label="Ciudad"
        all="Todas"
        // La ciudad la escribe quien carga el vehículo: tampoco hay una
        // lista conocida de antemano.
        empty="Sin ciudades todavía"
        value={value.ciudad}
        options={plain(facets.cities)}
        onChange={(ciudad) => onChange({ ciudad })}
      />

      {/* Carácter, no carrocería. "Deportivo" vive aquí precisamente porque
          un M3 es un sedán deportivo y un Golf GTI un hatchback deportivo. */}
      <ChoiceField
        legend="Carácter"
        label="Carácter del vehículo"
        all="Todos"
        empty="Sin etiquetas"
        value={value.etiqueta}
        options={plain(presentOrVocabulary(facets.tags, VEHICLE_TAGS))}
        onChange={(etiqueta) => onChange({ etiqueta })}
      />
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
