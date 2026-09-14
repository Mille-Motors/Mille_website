"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { adminVehiclesHref } from "@/lib/admin-urls";
import { cn } from "@/lib/cn";
import { formatCOP } from "@/lib/format";
import { typeLabel } from "@/lib/categories";
import { publicationMeta, statusMeta } from "@/lib/vehicle-status";
import {
  AVAILABILITY_STATUSES,
  PUBLICATION_STATUSES,
  VEHICLE_TYPES,
} from "@/types/vehicle";
import type {
  AdminVehicleQuery,
  AdminVehicleSort,
} from "@/server/vehicles/schemas";
import type { AdminVehicleFilterOptions } from "@/server/vehicles/service";

/**
 * Filtros del listado interno.
 *
 * Como en el inventario público, el estado es la URL: este componente solo
 * calcula la siguiente y navega. Compartir un enlace, recargar o usar
 * atrás/adelante dan exactamente el mismo resultado, y el servidor resuelve
 * la consulta contra la base.
 *
 * Lo que se usa a diario —buscar, publicación, disponibilidad, tipo— está a
 * la vista. Lo que se usa de vez en cuando —marca, categoría, año, precio—
 * vive en un panel que se abre. Con inventario grande hacen falta los ocho;
 * tenerlos los ocho siempre desplegados haría la pantalla ilegible.
 */
const sortLabels: Record<AdminVehicleSort, string> = {
  updated: "Actualizados recientemente",
  "created-desc": "Más nuevos",
  "created-asc": "Más antiguos",
  "price-asc": "Precio menor",
  "price-desc": "Precio mayor",
  "year-asc": "Año menor",
  "year-desc": "Año mayor",
};

/** Los filtros que viven en el panel, para saber si hay que abrirlo. */
const ADVANCED_KEYS = [
  "make",
  "categoryId",
  "minYear",
  "maxYear",
  "minPrice",
  "maxPrice",
] as const;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="eyebrow text-ink-muted/80">{label}</span>
      {children}
    </label>
  );
}

const selectClass =
  "h-10 w-full cursor-pointer appearance-none rounded-xs border border-stone bg-paper px-3 pr-8 text-sm text-ink transition-colors hover:border-stone-strong focus:border-burgundy focus:outline-none";

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <span className="relative block">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClass}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        strokeWidth={1.5}
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-muted"
      />
    </span>
  );
}

export function VehicleFilters({
  query,
  options,
  total,
}: {
  query: AdminVehicleQuery;
  options: AdminVehicleFilterOptions;
  total: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.q ?? "");
  const hasAdvanced = ADVANCED_KEYS.some((key) => query[key] !== undefined);
  const [panelOpen, setPanelOpen] = useState(hasAdvanced);

  // La búsqueda es el único control con estado propio; si la URL cambia por
  // otra vía —atrás, Limpiar filtros— el input tiene que seguirla. Se deriva
  // durante el render y no con un efecto, que encadenaría un segundo render
  // en cada navegación.
  const [seenQ, setSeenQ] = useState(query.q);
  if (seenQ !== query.q) {
    setSeenQ(query.q);
    setSearch(query.q ?? "");
  }

  /** Cualquier cambio de filtro vuelve a la página 1: la 7 podría no existir. */
  function go(patch: Partial<AdminVehicleQuery>) {
    const next = { ...query, ...patch, page: 1 };
    startTransition(() => router.push(adminVehiclesHref(next)));
  }

  const activeCount = [
    query.q,
    query.vehicleType,
    query.publication,
    query.availability,
    query.make,
    query.categoryId,
    query.minYear,
    query.maxYear,
    query.minPrice,
    query.maxPrice,
  ].filter((value) => value !== undefined).length;

  const chip = (active: boolean) =>
    cn(
      "label-caps inline-flex items-center gap-2 rounded-xs border px-3.5 py-2 text-[10px] transition-colors",
      active
        ? "border-burgundy bg-burgundy text-cream"
        : "border-stone text-ink-soft hover:border-stone-strong",
    );

  // La categoría pertenece a un universo: con Carros elegido, ofrecer una
  // categoría de moto sería ofrecer un cero garantizado.
  const categories = query.vehicleType
    ? options.categories.filter((c) => c.vehicleType === query.vehicleType)
    : options.categories;

  const years = options.years;
  const yearOptions: number[] = years
    ? Array.from({ length: years.max - years.min + 1 }, (_, i) => years.max - i)
    : [];

  const priceSteps = [
    20, 40, 60, 80, 100, 150, 200, 300, 400, 500, 750, 1000,
  ].map((m) => m * 1_000_000);

  return (
    <div className={cn("grid gap-4", pending && "opacity-60")} aria-busy={pending}>
      {/* Fila principal: buscar + orden */}
      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            go({ q: search.trim() || undefined });
          }}
          className="flex min-w-0 flex-1 gap-2 sm:max-w-md"
        >
          <span className="relative min-w-0 flex-1">
            <Search
              aria-hidden
              strokeWidth={1.4}
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Buscar por marca, modelo, versión o slug"
              placeholder="Marca, modelo, versión o slug"
              className="h-10 w-full rounded-xs border border-stone bg-paper pr-4 pl-10 text-sm text-ink transition-colors placeholder:text-ink-muted/70 hover:border-stone-strong focus:border-burgundy focus:outline-none"
            />
          </span>
          <button type="submit" className={chip(false)}>
            Buscar
          </button>
        </form>

        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          aria-expanded={panelOpen}
          className={chip(panelOpen || hasAdvanced)}
        >
          <SlidersHorizontal aria-hidden className="size-3.5" strokeWidth={1.5} />
          Más filtros
        </button>

        <span className="ml-auto min-w-0">
          <Select
            value={query.sort}
            onChange={(value) => go({ sort: value as AdminVehicleSort })}
          >
            {Object.entries(sortLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </span>
      </div>

      {/* Chips de uso diario */}
      <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div className="flex w-max items-center gap-2 sm:w-auto sm:flex-wrap">
          <button
            type="button"
            onClick={() => go({ publication: undefined, availability: undefined })}
            className={chip(!query.publication && !query.availability)}
          >
            Todos
          </button>

          {PUBLICATION_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() =>
                go({
                  publication: query.publication === status ? undefined : status,
                })
              }
              className={chip(query.publication === status)}
            >
              {publicationMeta[status].label}
            </button>
          ))}

          <span aria-hidden className="h-5 w-px bg-stone" />

          {AVAILABILITY_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() =>
                go({
                  availability: query.availability === status ? undefined : status,
                })
              }
              className={chip(query.availability === status)}
            >
              {statusMeta[status].label}
            </button>
          ))}

          <span aria-hidden className="h-5 w-px bg-stone" />

          {VEHICLE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() =>
                go({
                  vehicleType: query.vehicleType === type ? undefined : type,
                  // La categoría elegida puede no existir en el otro universo.
                  categoryId: undefined,
                })
              }
              className={chip(query.vehicleType === type)}
            >
              {typeLabel[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Panel: marca, categoría, año y precio */}
      {panelOpen ? (
        <div className="grid gap-4 border border-stone bg-paper px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Marca">
            <Select
              value={query.make ?? ""}
              onChange={(value) => go({ make: value || undefined })}
            >
              <option value="">Todas</option>
              {options.makes.map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Categoría">
            <Select
              value={query.categoryId ?? ""}
              onChange={(value) => go({ categoryId: value || undefined })}
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {query.vehicleType
                    ? ""
                    : ` · ${category.vehicleType === "moto" ? "Motos" : "Carros"}`}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Año">
            <span className="flex items-center gap-2">
              <Select
                value={query.minYear ? String(query.minYear) : ""}
                onChange={(value) =>
                  go({ minYear: value ? Number(value) : undefined })
                }
              >
                <option value="">Desde</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>
              <span aria-hidden className="text-ink-muted">
                –
              </span>
              <Select
                value={query.maxYear ? String(query.maxYear) : ""}
                onChange={(value) =>
                  go({ maxYear: value ? Number(value) : undefined })
                }
              >
                <option value="">Hasta</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>
            </span>
          </Field>

          <Field label="Precio">
            <span className="flex items-center gap-2">
              <Select
                value={query.minPrice ? String(query.minPrice) : ""}
                onChange={(value) =>
                  go({ minPrice: value ? Number(value) : undefined })
                }
              >
                <option value="">Desde</option>
                {priceSteps.map((step) => (
                  <option key={step} value={step}>
                    {formatCOP(step / 1_000_000)} M
                  </option>
                ))}
              </Select>
              <span aria-hidden className="text-ink-muted">
                –
              </span>
              <Select
                value={query.maxPrice ? String(query.maxPrice) : ""}
                onChange={(value) =>
                  go({ maxPrice: value ? Number(value) : undefined })
                }
              >
                <option value="">Hasta</option>
                {priceSteps.map((step) => (
                  <option key={step} value={step}>
                    {formatCOP(step / 1_000_000)} M
                  </option>
                ))}
              </Select>
            </span>
          </Field>
        </div>
      ) : null}

      {/* Recuento y limpieza */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-serif text-sm text-ink-muted tabular">
          {total} {total === 1 ? "vehículo" : "vehículos"}
          {activeCount > 0 ? " con estos filtros" : ""}
        </p>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              startTransition(() => router.push("/admin/vehiculos"));
            }}
            className="label-caps inline-flex items-center gap-1.5 text-[10px] text-ink-muted underline underline-offset-4 transition-colors hover:text-burgundy"
          >
            Limpiar filtros
            <X aria-hidden className="size-3" strokeWidth={1.6} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Anterior · Página X de Y · Siguiente. Nada más. */
export function VehiclePagination({
  query,
  total,
}: {
  query: AdminVehicleQuery;
  total: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const pages = Math.max(1, Math.ceil(total / query.limit));
  if (pages <= 1) return null;

  const goTo = (page: number) =>
    startTransition(() => router.push(adminVehiclesHref({ ...query, page })));

  const button =
    "label-caps rounded-xs border border-stone px-4 py-2 text-[10px] text-ink transition-colors hover:border-ink/40 disabled:opacity-35 disabled:hover:border-stone";

  return (
    <div
      className={cn("mt-6 flex items-center justify-between gap-4", pending && "opacity-60")}
    >
      <button
        type="button"
        disabled={query.page <= 1}
        onClick={() => goTo(query.page - 1)}
        className={button}
      >
        Anterior
      </button>
      <p className="font-serif text-sm text-ink-muted tabular">
        Página {query.page} de {pages}
      </p>
      <button
        type="button"
        disabled={query.page >= pages}
        onClick={() => goTo(query.page + 1)}
        className={button}
      >
        Siguiente
      </button>
    </div>
  );
}
