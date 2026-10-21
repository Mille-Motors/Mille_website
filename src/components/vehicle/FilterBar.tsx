"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  CalendarDays,
  Car,
  ChevronDown,
  CircleDollarSign,
  Fuel,
  Gauge,
  MapPin,
  SlidersHorizontal,
  Tag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useDialog } from "@/components/ui/use-dialog";
import {
  Field,
  RangeControl,
  SelectControl,
} from "@/components/vehicle/filter-controls";
import { formatCOP, formatInteger } from "@/lib/format";
import {
  DRIVETRAINS,
  FINAL_DRIVES,
  FUEL_TYPES,
  VEHICLE_TYPES,
  categoryLabel,
  tagsFor,
  transmissionsFor,
} from "@/types/vehicle";
import { typeLabel } from "@/lib/categories";
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
} from "@/lib/filters";
import type { InventoryFacets } from "@/lib/vehicles";

/**
 * La barra de filtros del inventario.
 *
 * La URL es el estado. Este componente solo calcula la URL siguiente y
 * navega; el servidor la vuelve a leer al llegar, así que atrás, adelante,
 * recargar y un enlace pegado se comportan igual, sin estado duplicado en el
 * navegador.
 *
 * En escritorio es una sola franja: Marca, Precio, Año, Kilometraje, Ciudad y
 * Ordenar por, cada uno con su icono, y «Más filtros» al final para lo que se
 * afina de vez en cuando. Los rangos son un solo campo «Desde – Hasta» que
 * abre un panel con las dos cotas. En teléfono todo cabe en una hoja que se
 * abre a propósito y que solo navega al aplicar. Los dos caminos escriben en
 * la misma URL: no hay dos estados que puedan discrepar.
 *
 * Lo primero que hace alguien —escribir, elegir cuatro o dos ruedas, una
 * carrocería— está arriba de esta barra, en la página; aquí vive lo demás.
 */
type Patch = Partial<InventoryFilters>;

/** Precio en millones, para las opciones y los resúmenes. */
function priceLabel(value: number): string {
  return `${formatCOP(value / 1_000_000)} M`.replace("$ ", "$");
}

/** «2019 – 2024», «Desde 2019», «Hasta 2024», o `null` si no hay rango. */
function rangeSummary(
  min: number | undefined,
  max: number | undefined,
  format: (value: number) => string,
  unit = "",
): string | null {
  if (min && max) return `${format(min)} – ${format(max)}${unit}`;
  if (min) return `Desde ${format(min)}${unit}`;
  if (max) return `Hasta ${format(max)}${unit}`;
  return null;
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
}

// ---------------------------------------------------------------------------
// Las cotas de cada rango, que son las mismas en la barra y en la hoja
// ---------------------------------------------------------------------------

function YearBounds({ value, facets, onChange }: FieldsProps) {
  return (
    <>
      <SelectControl
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
      </SelectControl>
      <SelectControl
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
      </SelectControl>
    </>
  );
}

function PriceBounds({ value, facets, onChange }: FieldsProps) {
  const prices = priceLadder(facets.minPrice, facets.maxPrice);
  return (
    <>
      <SelectControl
        label="Precio mínimo"
        value={value.minPrice ? String(value.minPrice) : ""}
        onChange={(v) => onChange({ minPrice: v ? Number(v) : undefined })}
      >
        <option value="">Desde</option>
        {prices.map((price) => (
          <option key={price} value={price}>
            {priceLabel(price)}
          </option>
        ))}
      </SelectControl>
      <SelectControl
        label="Precio máximo"
        value={value.maxPrice ? String(value.maxPrice) : ""}
        onChange={(v) => onChange({ maxPrice: v ? Number(v) : undefined })}
      >
        <option value="">Hasta</option>
        {prices.map((price) => (
          <option key={price} value={price}>
            {priceLabel(price)}
          </option>
        ))}
      </SelectControl>
    </>
  );
}

function KmBounds({ value, facets, onChange }: FieldsProps) {
  const steps = mileageLadder(facets.maxMileage);
  return (
    <>
      <SelectControl
        label="Kilometraje mínimo"
        value={value.minKm ? String(value.minKm) : ""}
        onChange={(v) => onChange({ minKm: v ? Number(v) : undefined })}
      >
        <option value="">Desde</option>
        {steps.map((km) => (
          <option key={km} value={km}>
            {formatInteger(km)} km
          </option>
        ))}
      </SelectControl>
      <SelectControl
        label="Kilometraje máximo"
        value={value.maxKm ? String(value.maxKm) : ""}
        onChange={(v) => onChange({ maxKm: v ? Number(v) : undefined })}
      >
        <option value="">Hasta</option>
        {steps.map((km) => (
          <option key={km} value={km}>
            {formatInteger(km)} km
          </option>
        ))}
      </SelectControl>
    </>
  );
}

// ---------------------------------------------------------------------------
// Los desplegables de una sola elección
// ---------------------------------------------------------------------------

/** Marca, con la marca puesta aunque ya no exista en este universo. */
function makesFor(value: InventoryFilters, facets: InventoryFacets): string[] {
  // Una marca puede estar filtrando sin existir en este universo (Carros +
  // KTM). Se conserva en la lista para que el control muestre lo que está
  // aplicado de verdad en vez de decir "Todas".
  return value.marca && !facets.makes.includes(value.marca)
    ? [...facets.makes, value.marca].sort((a, b) => a.localeCompare(b, "es"))
    : facets.makes;
}

function MakeSelect({ value, facets, onChange }: FieldsProps) {
  const makes = makesFor(value, facets);
  const disabled = makes.length === 0;
  return (
    <SelectControl
      icon={Tag}
      label="Marca"
      value={value.marca ?? ""}
      disabled={disabled}
      // Cambiar de marca invalida el modelo elegido: un "Serie 3" con marca
      // Audi daría cero y no se vería por qué.
      onChange={(marca) => onChange({ marca: marca || undefined, modelo: undefined })}
    >
      {/* La marca sí depende del inventario: no hay una lista conocida de
          antemano y nombrar una que MILLE no ha tenido nunca sería inventarla. */}
      <option value="">{disabled ? "Sin marcas todavía" : "Todas"}</option>
      {makes.map((make) => (
        <option key={make} value={make}>
          {make}
        </option>
      ))}
    </SelectControl>
  );
}

/**
 * El combustible, con todas las propulsiones.
 *
 * Es independiente de la carrocería y se combina con ella: un BMW X5 es una
 * camioneta Y un híbrido enchufable, y quien busca camionetas eléctricas elige
 * las dos cosas. Antes vivía dentro de «Más filtros», cerrado, y no se veía que
 * se podía.
 *
 * Se ofrece el vocabulario entero y no solo lo que hay en stock: elegir
 * «Eléctrico» sin ninguno devuelve la pantalla de «no hay», que dice qué se
 * buscó y deja contárnoslo; esconder la opción dejaba a la persona sin saber si
 * MILLE trabaja ese tipo de vehículo.
 */
function FuelSelect({ value, facets, onChange }: FieldsProps) {
  const known: string[] = [...FUEL_TYPES];
  // Un valor que existe en el inventario pero ya no está en el vocabulario, o
  // que viene en la URL, se conserva para que el control diga lo que filtra.
  const extra = [...facets.fuelTypes, ...(value.combustible ? [value.combustible] : [])].filter(
    (fuel, index, all) => !known.includes(fuel) && all.indexOf(fuel) === index,
  );
  return (
    <SelectControl
      icon={Fuel}
      label="Combustible"
      value={value.combustible ?? ""}
      onChange={(combustible) => onChange({ combustible: combustible || undefined })}
    >
      <option value="">Todos</option>
      {[...known, ...extra].map((fuel) => (
        <option key={fuel} value={fuel}>
          {fuel}
        </option>
      ))}
    </SelectControl>
  );
}

function CitySelect({ value, facets, onChange }: FieldsProps) {
  const disabled = facets.cities.length === 0;
  return (
    <SelectControl
      icon={MapPin}
      label="Ciudad"
      value={value.ciudad ?? ""}
      disabled={disabled}
      onChange={(ciudad) => onChange({ ciudad: ciudad || undefined })}
    >
      {/* La ciudad la escribe quien carga el vehículo: tampoco hay una lista
          conocida de antemano. */}
      <option value="">{disabled ? "Sin ciudades todavía" : "Todas"}</option>
      {facets.cities.map((city) => (
        <option key={city} value={city}>
          {city}
        </option>
      ))}
    </SelectControl>
  );
}

/**
 * Un desplegable de «Todas / una de estas», que es la forma de casi todos los
 * filtros de «Más filtros».
 *
 * Sin opciones no desaparece: se queda deshabilitado diciendo qué falta.
 * Esconderlo dejaba el panel vacío con el inventario en cero, que se lee como
 * una pantalla rota y no como un inventario vacío.
 */
function ChoiceField({
  legend,
  all,
  empty,
  value,
  options,
  onChange,
}: {
  legend: string;
  /** «Todas» o «Todos», según el género de lo que se filtra. */
  all: string;
  /** Qué se lee cuando todavía no hay nada que elegir. */
  empty: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (value: string | undefined) => void;
}) {
  const disabled = options.length === 0;
  return (
    <Field label={legend}>
      <SelectControl
        label={legend}
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
      </SelectControl>
    </Field>
  );
}

// ---------------------------------------------------------------------------
// Lo que se afina de vez en cuando
// ---------------------------------------------------------------------------

/**
 * Los filtros de «Más filtros»: modelo, transmisión, tracción, transmisión
 * final y carácter. Combustible, kilometraje y ciudad salieron de aquí y están
 * en la barra principal.
 *
 * Todos se dibujan siempre. Antes se escondían los que ofrecían menos de dos
 * opciones y con el inventario en cero el panel se abría vacío. Ahora la
 * ausencia se dice, no se esconde: los que tienen vocabulario conocido caen a
 * la lista completa y los que dependen de los datos se quedan deshabilitados
 * explicando qué falta.
 */
function SecondaryFields({
  value,
  facets,
  onChange,
  className,
}: FieldsProps & { className?: string }) {
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
        all="Todos"
        empty={
          // Dos ausencias distintas, y se distinguen: con una marca elegida
          // que no tiene modelos, el problema es esa marca; sin marca, es que
          // no hay inventario del que sacarlos.
          value.marca ? "Sin modelos de esa marca" : "Sin modelos todavía"
        }
        value={value.modelo}
        options={modelOptions}
        onChange={(modelo) => onChange({ modelo })}
      />

      {/* El vocabulario de transmisión no se mezcla: con Motos elegido se
          ofrecen cajas de moto y con Carros las de carro. */}
      <ChoiceField
        legend="Transmisión"
        all="Todas"
        empty="Sin transmisiones"
        value={value.transmision}
        options={plain(
          value.tipo === "all"
            ? facets.transmissions
            : presentOrVocabulary(
                facets.transmissions,
                transmissionsFor(value.tipo),
              ),
        )}
        onChange={(transmision) => onChange({ transmision })}
      />

      {/* FWD/RWD/AWD solo en carros; cadena, correa y cardán solo en motos.
          Ofrecerle "Integral" a quien busca una moto es ofrecerle un cero. */}
      {value.tipo !== "moto" ? (
        <ChoiceField
          legend="Tracción"
          all="Todas"
          empty="Sin tracciones"
          value={value.traccion}
          options={plain(presentOrVocabulary(facets.drivetrains, DRIVETRAINS))}
          onChange={(traccion) => onChange({ traccion })}
        />
      ) : null}

      {value.tipo !== "auto" ? (
        <ChoiceField
          legend="Transmisión final"
          all="Todas"
          empty="Sin transmisiones finales"
          value={value.transmisionFinal}
          options={plain(
            // En "Todos" solo se ofrece lo que exista: volcar el vocabulario
            // entero sobre un inventario de puros carros prometería ceros.
            value.tipo === "moto"
              ? presentOrVocabulary(facets.finalDrives, FINAL_DRIVES)
              : facets.finalDrives,
          )}
          onChange={(transmisionFinal) => onChange({ transmisionFinal })}
        />
      ) : null}

      {/* Carácter, no carrocería. "Deportivo" vive aquí precisamente porque
          un M3 es un sedán deportivo y un Golf GTI un hatchback deportivo. */}
      <ChoiceField
        legend="Carácter"
        all="Todos"
        empty="Sin etiquetas"
        value={value.etiqueta}
        options={plain(
          value.tipo === "all"
            ? facets.tags
            : presentOrVocabulary(facets.tags, tagsFor(value.tipo)),
        )}
        onChange={(etiqueta) => onChange({ etiqueta })}
      />
    </div>
  );
}

/** Cuántos filtros de «Más filtros» están puestos: decide si el panel nace abierto. */
function secondaryCount(filters: InventoryFilters): number {
  return [
    filters.modelo,
    filters.transmision,
    filters.traccion,
    filters.transmisionFinal,
    filters.etiqueta,
  ].filter((value) => value !== undefined).length;
}

// ---------------------------------------------------------------------------
// La barra
// ---------------------------------------------------------------------------

/** Cada campo ocupa su celda de la rejilla; que el texto no se salga es cosa de la celda. */
const cell = "min-w-0";

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
  const moreCount = secondaryCount(filters);
  // Llegar con un enlace que ya trae un filtro afinado tiene que enseñarlo:
  // esconderlo detrás de «Más filtros» haría creer que no está puesto.
  const [moreOpen, setMoreOpen] = useState(() => moreCount > 0);
  const sheetRef = useRef<HTMLDivElement>(null);
  // La hoja edita un borrador para que un teléfono no navegue a cada toque.
  const [draft, setDraft] = useState<InventoryFilters>(filters);
  const activeCount = activeFilterCount(filters);

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

  const prices = priceLadder(facets.minPrice, facets.maxPrice);
  const mileages = mileageLadder(facets.maxMileage);

  const sortSelect = (
    <SelectControl
      icon={ArrowUpDown}
      label="Ordenar por"
      value={filters.orden === "recientes" ? "" : filters.orden}
      onChange={(v) => patch({ orden: (v || "recientes") as SortKey })}
    >
      {SORT_KEYS.map((key) => (
        <option key={key} value={key === "recientes" ? "" : key}>
          {sortLabels[key]}
        </option>
      ))}
    </SelectControl>
  );

  const bar: FieldsProps = { value: filters, facets, onChange: patch };
  const sheet: FieldsProps = {
    value: draft,
    facets,
    onChange: (p) => setDraft((d) => ({ ...d, ...p })),
  };

  // La carrocería es taxonomía administrable: se ofrece la que está activa en
  // la base, la misma que la portada y las píldoras, tenga o no vehículos hoy.
  const bodies = facets.categories;
  // En la vista «Todos» conviven las dos listas; se separan por universo para
  // que «Sport» no aparezca al lado de «Sedanes» sin decir de qué es.
  const bodyGroups: { label: string | null; items: typeof bodies }[] =
    draft.tipo === "all"
      ? VEHICLE_TYPES.map((type) => ({
          label: typeLabel[type],
          items: bodies.filter((category) => category.vehicleType === type),
        })).filter((group) => group.items.length > 0)
      : [{ label: null, items: bodies }];
  const bodyLegend = draft.tipo === "all" ? "Categoría" : categoryLabel(draft.tipo);

  return (
    <div className={cn("transition-opacity", pending && "opacity-60")} aria-busy={pending}>
      {/* Escritorio: una franja de campos con su icono. */}
      <div className="hidden rounded-2xl border border-ink/12 bg-paper/60 p-5 lg:block">
        {/* Una rejilla que decide por ancho y no una fila que se rompe donde
            le toca: tres columnas, cuatro, y los siete en una sola línea solo
            cuando cada campo conserva espacio para leerse entero. */}
        <div className="grid grid-cols-3 items-end gap-x-4 gap-y-4 xl:max-[1699px]:grid-cols-4 min-[1700px]:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)_repeat(5,minmax(0,1fr))_auto]">
          <Field label="Marca" className={cell}>
            <MakeSelect {...bar} />
          </Field>

          <Field label="Combustible" className={cell}>
            <FuelSelect {...bar} />
          </Field>

          <Field label="Precio" className={cell}>
            <RangeControl
              label="Precio"
              icon={CircleDollarSign}
              summary={rangeSummary(filters.minPrice, filters.maxPrice, priceLabel)}
              placeholder={prices.length > 0 ? "Desde – Hasta" : "Sin precios todavía"}
              disabled={prices.length === 0}
              onClear={() => patch({ minPrice: undefined, maxPrice: undefined })}
            >
              <PriceBounds {...bar} />
            </RangeControl>
          </Field>

          <Field label="Año" className={cell}>
            <RangeControl
              label="Año"
              icon={CalendarDays}
              summary={rangeSummary(filters.minYear, filters.maxYear, String)}
              placeholder={facets.years.length > 0 ? "Desde – Hasta" : "Sin años todavía"}
              disabled={facets.years.length === 0}
              onClear={() => patch({ minYear: undefined, maxYear: undefined })}
            >
              <YearBounds {...bar} />
            </RangeControl>
          </Field>

          <Field label="Kilometraje" className={cell}>
            <RangeControl
              label="Kilometraje"
              icon={Gauge}
              summary={rangeSummary(filters.minKm, filters.maxKm, formatInteger, " km")}
              placeholder={
                mileages.length > 0 ? "Desde – Hasta" : "Sin kilometrajes todavía"
              }
              disabled={mileages.length === 0}
              onClear={() => patch({ minKm: undefined, maxKm: undefined })}
            >
              <KmBounds {...bar} />
            </RangeControl>
          </Field>

          <Field label="Ciudad" className={cell}>
            <CitySelect {...bar} />
          </Field>

          <Field label="Ordenar por" className={cell}>
            {sortSelect}
          </Field>

          {/* «Más filtros»: al final de la fila cuando cabe, y en el borde
              derecho de la última fila cuando no. */}
          <div className="col-span-2 flex items-center justify-self-end xl:max-[1699px]:col-span-1 min-[1700px]:col-span-1 min-[1700px]:gap-4">
            <span
              aria-hidden
              className="hidden h-12 w-px bg-ink/12 min-[1700px]:block"
            />
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              aria-expanded={moreOpen}
              className="inline-flex h-12 shrink-0 items-center gap-2.5 rounded-xl px-2 text-base font-medium text-burgundy transition-colors hover:text-burgundy-dark"
            >
              <SlidersHorizontal aria-hidden className="size-4.5" strokeWidth={1.5} />
              Más filtros
              {moreCount > 0 ? (
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-burgundy text-xs text-cream tabular">
                  {moreCount}
                </span>
              ) : null}
              <ChevronDown
                aria-hidden
                strokeWidth={1.5}
                className={cn("size-4 transition-transform", moreOpen && "rotate-180")}
              />
            </button>
          </div>
        </div>

        {moreOpen ? (
          <SecondaryFields
            {...bar}
            className="mt-5 grid gap-x-4 gap-y-4 border-t border-ink/12 pt-5 sm:grid-cols-2 xl:grid-cols-3"
          />
        ) : null}
      </div>

      {/* Por debajo de escritorio: los campos pasan a una hoja y el orden se
          queda fuera. */}
      <div className="flex items-end justify-between gap-4 lg:hidden">
        <button
          type="button"
          onClick={() => {
            setDraft(filters);
            setSheetOpen(true);
          }}
          className="press inline-flex h-12 shrink-0 items-center gap-2.5 rounded-xl border border-ink/15 bg-paper px-5 text-base text-ink"
        >
          <SlidersHorizontal aria-hidden className="size-4.5" strokeWidth={1.5} />
          Filtros
          {activeCount > 0 ? (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-burgundy text-xs text-cream tabular">
              {activeCount}
            </span>
          ) : null}
        </button>
        <div className="min-w-0 flex-1 sm:max-w-64">{sortSelect}</div>
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
            // El relleno inferior despeja el indicador de inicio del iPhone
            // para que la fila de acciones nunca quede a medias debajo.
            style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
            className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-2xl bg-cream"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone bg-cream px-5 py-4">
              <h2 className="text-xl font-medium text-ink">Filtros</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Cerrar filtros"
                className="-mr-2 inline-flex size-10 items-center justify-center text-ink"
              >
                <X aria-hidden className="size-5" strokeWidth={1.25} />
              </button>
            </div>

            <div className="grid gap-5 px-5 pt-6 pb-6">
              {/* La carrocería es el mismo `?categoria=` que las píldoras de
                  arriba, no un filtro paralelo. Aquí importa en la vista
                  «Todos», donde esas píldoras no se dibujan. */}
              <Field label={bodyLegend}>
                <SelectControl
                  icon={Car}
                  label={bodyLegend}
                  value={draft.categoria ?? ""}
                  disabled={bodies.length === 0}
                  onChange={(v) => sheet.onChange({ categoria: v || undefined })}
                >
                  <option value="">
                    {bodies.length === 0 ? "Sin categorías definidas" : "Todas"}
                  </option>
                  {bodyGroups.map((group) => {
                    const options = group.items.map((category) => (
                      <option key={category.slug} value={category.slug}>
                        {category.pluralName}
                      </option>
                    ));
                    return group.label ? (
                      <optgroup key={group.label} label={group.label}>
                        {options}
                      </optgroup>
                    ) : (
                      options
                    );
                  })}
                </SelectControl>
              </Field>

              <Field label="Marca">
                <MakeSelect {...sheet} />
              </Field>

              <Field label="Combustible">
                <FuelSelect {...sheet} />
              </Field>

              <Field label="Precio">
                {prices.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    <PriceBounds {...sheet} />
                  </div>
                ) : (
                  <SelectControl label="Precio" value="" disabled onChange={() => {}}>
                    <option value="">Sin precios todavía</option>
                  </SelectControl>
                )}
              </Field>

              <Field label="Año">
                {facets.years.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    <YearBounds {...sheet} />
                  </div>
                ) : (
                  <SelectControl label="Año" value="" disabled onChange={() => {}}>
                    <option value="">Sin años todavía</option>
                  </SelectControl>
                )}
              </Field>

              <Field label="Kilometraje">
                {mileages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    <KmBounds {...sheet} />
                  </div>
                ) : (
                  <SelectControl label="Kilometraje" value="" disabled onChange={() => {}}>
                    <option value="">Sin kilometrajes todavía</option>
                  </SelectControl>
                )}
              </Field>

              <Field label="Ciudad">
                <CitySelect {...sheet} />
              </Field>
            </div>

            <SecondaryFields
              {...sheet}
              className="grid gap-5 border-t border-stone px-5 py-6"
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
 * Los filtros puestos, como texto quieto que se quita con un toque, y no como
 * píldoras de panel de control.
 *
 * Cada filtro puesto tiene su ficha y su forma de quitarse. Con tantos filtros
 * posibles esto dejó de ser un adorno: es lo único que responde "¿por qué veo
 * tan pocos carros?" sin obligar a abrir el panel y repasarlo entero.
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

  if (filters.q) {
    chips.push({
      key: "q",
      label: `“${filters.q}”`,
      clear: { q: undefined },
    });
  }
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
  if (filters.transmisionFinal) {
    chips.push({
      key: "transmisionFinal",
      label: filters.transmisionFinal,
      clear: { transmisionFinal: undefined },
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

  const year = rangeSummary(filters.minYear, filters.maxYear, String);
  if (year) {
    chips.push({
      key: "anio",
      label: year,
      clear: { minYear: undefined, maxYear: undefined },
    });
  }
  const price = rangeSummary(
    filters.minPrice,
    filters.maxPrice,
    (v) => `$${v / 1_000_000} M`,
  );
  if (price) {
    chips.push({
      key: "precio",
      label: price,
      clear: { minPrice: undefined, maxPrice: undefined },
    });
  }
  const km = rangeSummary(filters.minKm, filters.maxKm, formatInteger, " km");
  if (km) {
    chips.push({
      key: "km",
      label: km,
      clear: { minKm: undefined, maxKm: undefined },
    });
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2.5">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onPatch(chip.clear)}
          className="press inline-flex min-h-9 items-center gap-2 rounded-full border border-ink/20 px-3.5 py-1.5 text-sm text-ink-soft hover:border-burgundy/60 hover:text-burgundy"
        >
          {chip.label}
          <X aria-hidden className="size-3" strokeWidth={1.6} />
          <span className="sr-only">Quitar filtro</span>
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="ml-1 text-sm text-ink-muted underline underline-offset-4 transition-colors hover:text-burgundy"
      >
        Limpiar todo
      </button>
    </div>
  );
}
