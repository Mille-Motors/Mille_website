"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ActiveFilters,
  AdminField,
  AdminSelect,
  Chip,
  ChipRow,
  FilterButton,
  FilterPanel,
  Pager,
  SearchBox,
} from "@/components/admin/kit";
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
 * Una sola barra. A la vista, lo que se usa a diario: buscar, la
 * publicación y la disponibilidad —los dos ejes del inventario— y el orden.
 * Lo que se usa de vez en cuando —tipo, marca, carrocería, año y precio—
 * vive en el panel «Filtros»; con inventario grande hacen falta todos,
 * pero tenerlos siempre desplegados haría la pantalla ilegible.
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
  "vehicleType",
  "make",
  "categoryId",
  "minYear",
  "maxYear",
  "minPrice",
  "maxPrice",
] as const;

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
    query.publication,
    query.availability,
    ...ADVANCED_KEYS.map((key) => query[key]),
  ].filter((value) => value !== undefined).length;

  // Lo que dice la insignia del botón: cuántos criterios hay dentro del
  // panel. Un rango de año o de precio es un criterio, no dos.
  const panelCount = [
    query.vehicleType,
    query.make,
    query.categoryId,
    query.minYear ?? query.maxYear,
    query.minPrice ?? query.maxPrice,
  ].filter((value) => value !== undefined).length;

  // La carrocería pertenece a un universo: con Carros elegido, ofrecer una
  // carrocería de moto sería ofrecer un cero garantizado.
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

  const noPublication = !query.publication && !query.availability;

  return (
    <div className={cn("mb-4", pending && "opacity-60")} aria-busy={pending}>
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox
          value={search}
          onChange={setSearch}
          onSubmit={() => go({ q: search.trim() || undefined })}
          label="Buscar por marca, modelo, versión o slug"
          placeholder="Buscar marca, modelo, versión o slug…"
        />

        <FilterButton
          open={panelOpen}
          count={panelCount}
          controls="vehicle-filter-panel"
          onClick={() => setPanelOpen((open) => !open)}
        />

        {/* Los dos ejes del inventario. Solo uno de cada eje a la vez. */}
        <ChipRow
          label="Estado"
          className="order-last min-[1600px]:order-0 min-[1600px]:m-0 min-[1600px]:w-auto min-[1600px]:overflow-visible min-[1600px]:p-0"
        >
          <Chip
            active={noPublication}
            onClick={() => go({ publication: undefined, availability: undefined })}
          >
            Todos
          </Chip>

          {PUBLICATION_STATUSES.map((status) => (
            <Chip
              key={status}
              active={query.publication === status}
              onClick={() =>
                go({
                  publication: query.publication === status ? undefined : status,
                })
              }
            >
              {publicationMeta[status].label}
            </Chip>
          ))}

          <span aria-hidden className="mx-1 h-5 w-px bg-stone-strong" />

          {AVAILABILITY_STATUSES.map((status) => (
            <Chip
              key={status}
              active={query.availability === status}
              onClick={() =>
                go({
                  availability: query.availability === status ? undefined : status,
                })
              }
            >
              {statusMeta[status].label}
            </Chip>
          ))}
        </ChipRow>

        <span className="ml-auto flex min-w-0 flex-1 sm:w-60 sm:flex-none">
          <AdminSelect
            label="Ordenar por"
            value={query.sort}
            onChange={(value) => go({ sort: value as AdminVehicleSort })}
          >
            {Object.entries(sortLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </AdminSelect>
        </span>
      </div>

      {/* Panel: tipo, marca, carrocería, año y precio */}
      {panelOpen ? (
        <FilterPanel id="vehicle-filter-panel" className="lg:grid-cols-5">
          <AdminField label="Tipo">
            <span
              role="group"
              aria-label="Tipo de vehículo"
              className="inline-flex h-9 items-center gap-0.5 rounded-lg border border-stone-strong p-0.5"
            >
              {[undefined, ...VEHICLE_TYPES].map((type) => {
                const active = query.vehicleType === type;
                return (
                  <button
                    key={type ?? "todos"}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      go({
                        vehicleType: type,
                        // La carrocería elegida puede no existir en el otro universo.
                        categoryId: undefined,
                      })
                    }
                    className={cn(
                      "h-8 flex-1 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-offset-1",
                      active
                        ? "bg-burgundy text-cream"
                        : "text-ink-soft hover:bg-sand",
                    )}
                  >
                    {type ? typeLabel[type] : "Todos"}
                  </button>
                );
              })}
            </span>
          </AdminField>

          <AdminField label="Marca">
            <AdminSelect
              value={query.make ?? ""}
              onChange={(value) => go({ make: value || undefined })}
            >
              <option value="">Todas</option>
              {options.makes.map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
            </AdminSelect>
          </AdminField>

          <AdminField label="Carrocería">
            <AdminSelect
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
            </AdminSelect>
          </AdminField>

          <AdminField label="Año">
            <span className="flex items-center gap-2">
              <AdminSelect
                label="Año desde"
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
              </AdminSelect>
              <span aria-hidden className="text-ink-muted">
                –
              </span>
              <AdminSelect
                label="Año hasta"
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
              </AdminSelect>
            </span>
          </AdminField>

          <AdminField label="Precio">
            <span className="flex items-center gap-2">
              <AdminSelect
                label="Precio desde"
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
              </AdminSelect>
              <span aria-hidden className="text-ink-muted">
                –
              </span>
              <AdminSelect
                label="Precio hasta"
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
              </AdminSelect>
            </span>
          </AdminField>
        </FilterPanel>
      ) : null}

      {/* Solo cuando hay algo que limpiar: un renglón permanente que casi
          siempre dice lo mismo deja de leerse. */}
      {activeCount > 0 ? (
        <ActiveFilters
          summary={`${total} ${total === 1 ? "vehículo" : "vehículos"} con estos filtros`}
          onClear={() => {
            setSearch("");
            startTransition(() => router.push("/admin/vehiculos"));
          }}
        />
      ) : null}
    </div>
  );
}

/** Pie de la lista de vehículos: el recuento y las páginas. */
export function VehiclePagination({
  query,
  total,
  shown,
}: {
  query: AdminVehicleQuery;
  total: number;
  /** Cuántas filas trae esta página. */
  shown: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Pager
      page={query.page}
      pages={Math.max(1, Math.ceil(total / query.limit))}
      total={total}
      shown={shown}
      limit={query.limit}
      noun={["vehículo", "vehículos"]}
      pending={pending}
      onPage={(page) =>
        startTransition(() => router.push(adminVehiclesHref({ ...query, page })))
      }
    />
  );
}
