"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { publicationMeta, statusMeta } from "@/lib/vehicle-status";
import { typeLabel } from "@/lib/categories";
import {
  AVAILABILITY_STATUSES,
  PUBLICATION_STATUSES,
  VEHICLE_TYPES,
} from "@/types/vehicle";
import type { AdminVehicleQuery } from "@/server/vehicles/schemas";

/**
 * Búsqueda y filtros del listado interno. Como en el inventario público, el
 * estado es la URL: este componente solo calcula la siguiente y navega.
 */
export function VehicleFilters({
  query,
  total,
}: {
  query: AdminVehicleQuery;
  total: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.q ?? "");

  function go(patch: Partial<AdminVehicleQuery>) {
    const next = { ...query, ...patch, page: 1 };
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.vehicleType) params.set("vehicleType", next.vehicleType);
    if (next.publication) params.set("publication", next.publication);
    if (next.availability) params.set("availability", next.availability);
    const qs = params.toString();
    startTransition(() => router.push(`/admin/vehiculos${qs ? `?${qs}` : ""}`));
  }

  const hasFilters = Boolean(
    query.q || query.vehicleType || query.publication || query.availability,
  );

  const chip = (active: boolean) =>
    cn(
      "label-caps inline-flex items-center gap-2 rounded-xs border px-3.5 py-2 text-[10px] transition-colors",
      active
        ? "border-burgundy bg-burgundy text-cream"
        : "border-stone text-ink-soft hover:border-stone-strong",
    );

  return (
    <div className={cn("grid gap-4", pending && "opacity-60")} aria-busy={pending}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          go({ q: search.trim() || undefined });
        }}
        className="flex gap-2"
      >
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search
            aria-hidden
            strokeWidth={1.4}
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Buscar por marca, modelo o slug"
            placeholder="Marca, modelo o slug"
            className="h-11 w-full rounded-xs border border-stone bg-paper pr-4 pl-10 text-sm text-ink transition-colors placeholder:text-ink-muted/70 hover:border-stone-strong focus:border-burgundy focus:outline-none"
          />
        </div>
        <button type="submit" className={chip(false)}>
          Buscar
        </button>
      </form>

      <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div className="flex w-max items-center gap-2 sm:w-auto sm:flex-wrap">
          <button
            type="button"
            onClick={() => go({ publication: undefined, availability: undefined })}
            className={chip(!query.publication && !query.availability)}
          >
            Todos
            <span className="opacity-60 tabular">{total}</span>
          </button>

          {PUBLICATION_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() =>
                go({
                  publication: query.publication === status ? undefined : status,
                  availability: undefined,
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
                go({ vehicleType: query.vehicleType === type ? undefined : type })
              }
              className={chip(query.vehicleType === type)}
            >
              {typeLabel[type]}
            </button>
          ))}

          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                startTransition(() => router.push("/admin/vehiculos"));
              }}
              className="label-caps ml-1 inline-flex items-center gap-1.5 text-[10px] text-ink-muted underline underline-offset-4 transition-colors hover:text-burgundy"
            >
              Limpiar
              <X aria-hidden className="size-3" strokeWidth={1.6} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
