"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bike, Car, ChevronDown, Search, Trash2, X } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { adminJson, adminRequest } from "@/lib/admin-client";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { typeLabel } from "@/lib/categories";
import {
  INQUIRY_VIEWS,
  allowsDeletion,
  inquiryViewLabels,
  inquiryViewStatuses,
  type InquiryView,
} from "@/lib/inquiry-views";
import { INQUIRY_TYPES, VEHICLE_TYPES } from "@/types/vehicle";
import type { Inquiry, InquiryStatus, InquiryType } from "@/types/vehicle";
import type { AdminInquiryQuery } from "@/server/inquiries/schemas";
import type { InquiryVehicleOption } from "@/server/inquiries/service";

/** Singular, para la insignia de una fila. */
const statusBadge: Record<InquiryStatus, string> = {
  new: "Nueva",
  contacted: "Contactada",
  closed: "Cerrada",
  spam: "Spam",
};

const statusPill: Record<InquiryStatus, string> = {
  new: "border-status-available/30 bg-status-available/10 text-status-available",
  contacted: "border-status-reserved/30 bg-status-reserved/10 text-status-reserved",
  closed: "border-stone-strong/40 bg-sand text-ink-muted",
  spam: "border-status-sold/30 bg-status-sold/10 text-status-sold",
};

const typeLabels: Record<InquiryType, string> = {
  general: "General",
  vehicle_info: "Información de vehículo",
  appointment: "Cita",
};

export function adminInquiriesHref(query: Partial<AdminInquiryQuery>): string {
  const params = new URLSearchParams();
  const set = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  };
  // La bandeja de trabajo es la de por defecto, así que no ensucia la URL.
  if (query.view && query.view !== "activas") set("view", query.view);
  set("status", query.status);
  set("type", query.type);
  set("vehicleType", query.vehicleType);
  set("vehicleId", query.vehicleId);
  set("q", query.q);
  if (query.page && query.page > 1) set("page", query.page);
  const qs = params.toString();
  return `/admin/solicitudes${qs ? `?${qs}` : ""}`;
}

const selectClass =
  "h-10 w-full cursor-pointer appearance-none rounded-xs border border-stone bg-paper px-3 pr-8 text-sm text-ink transition-colors hover:border-stone-strong focus:border-burgundy focus:outline-none";

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="eyebrow text-ink-muted/80">{label}</span>
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
    </label>
  );
}

const rowAction =
  "label-caps rounded-xs border border-stone px-3 py-1.5 text-[10px] text-ink transition-colors hover:border-ink/40 disabled:opacity-40";

/**
 * Acciones de una solicitud.
 *
 * Borrar y "spam y eliminar" piden confirmación en la propia fila, igual que
 * el borrado de vehículos: es definitivo y no debe caber en un solo clic.
 */
function RowActions({
  inquiry,
  view,
  busy,
  onStatus,
  onDelete,
}: {
  inquiry: Inquiry;
  view: InquiryView;
  busy: boolean;
  onStatus: (id: string, status: InquiryStatus) => void;
  onDelete: (id: string, reason?: "spam") => void;
}) {
  const [confirming, setConfirming] = useState<null | "delete" | "spam">(null);

  if (confirming) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="font-serif text-xs text-ink-soft">
          {confirming === "spam"
            ? "¿Marcar como spam y eliminarla definitivamente? Esta acción no se puede deshacer."
            : "¿Eliminar esta solicitud definitivamente? Esta acción no se puede deshacer."}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(inquiry.id, confirming === "spam" ? "spam" : undefined)}
          className="label-caps rounded-xs bg-burgundy px-3 py-1.5 text-[10px] text-cream disabled:opacity-40"
        >
          Sí, eliminar
        </button>
        <button
          type="button"
          onClick={() => setConfirming(null)}
          className={rowAction}
        >
          Cancelar
        </button>
      </div>
    );
  }

  // Dentro de una bandeja solo se ofrecen los estados que sacan la solicitud
  // de ella o la mueven dentro: repetir el estado actual no hace nada.
  const moves = (["new", "contacted", "closed", "spam"] as const).filter(
    (status) => status !== inquiry.status,
  );

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {moves.map((status) => (
        <button
          key={status}
          type="button"
          disabled={busy}
          onClick={() => onStatus(inquiry.id, status)}
          className={rowAction}
        >
          {status === "spam" ? "Marcar como spam" : statusBadge[status]}
        </button>
      ))}

      {view === "activas" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirming("spam")}
          className={cn(rowAction, "hover:border-burgundy/40 hover:text-burgundy")}
        >
          Spam y eliminar
        </button>
      ) : null}

      {allowsDeletion(view) ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirming("delete")}
          aria-label={`Eliminar la solicitud de ${inquiry.name}`}
          className={cn(
            rowAction,
            "inline-flex items-center gap-1.5 hover:border-burgundy/40 hover:text-burgundy",
          )}
        >
          <Trash2 aria-hidden className="size-3" strokeWidth={1.5} />
          Eliminar solicitud
        </button>
      ) : null}
    </div>
  );
}

export function InquiriesAdmin({
  inquiries,
  counts,
  total,
  query,
  vehicleOptions,
}: {
  inquiries: Inquiry[];
  counts: Record<InquiryStatus, number>;
  total: number;
  query: AdminInquiryQuery;
  vehicleOptions: InquiryVehicleOption[];
}) {
  const router = useRouter();
  const [navigating, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(query.q ?? "");

  // Si la URL cambia por otra vía —atrás, Limpiar filtros— el input la sigue.
  const [seenQ, setSeenQ] = useState(query.q);
  if (seenQ !== query.q) {
    setSeenQ(query.q);
    setSearch(query.q ?? "");
  }

  async function setStatus(id: string, next: InquiryStatus) {
    if (busy) return;
    setBusy(id);
    setError(null);
    const result = await adminJson(`/api/admin/inquiries/${id}`, "PATCH", {
      status: next,
    });
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  async function remove(id: string, reason?: "spam") {
    if (busy) return;
    setBusy(id);
    setError(null);
    const result = await adminRequest(
      `/api/admin/inquiries/${id}${reason ? `?reason=${reason}` : ""}`,
      { method: "DELETE" },
    );
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  /** Cambiar bandeja o filtro vuelve a la página 1. */
  function go(patch: Partial<AdminInquiryQuery>) {
    startTransition(() =>
      router.push(adminInquiriesHref({ ...query, ...patch, page: 1 })),
    );
  }

  const chip = (active: boolean) =>
    cn(
      "label-caps inline-flex items-center gap-2 rounded-xs border px-3.5 py-2 text-[10px] transition-colors",
      active
        ? "border-burgundy bg-burgundy text-cream"
        : "border-stone text-ink-soft hover:border-stone-strong",
    );

  const viewCount = (view: InquiryView) =>
    inquiryViewStatuses[view].reduce((sum, status) => sum + counts[status], 0);

  const activeCount = [
    query.status,
    query.type,
    query.vehicleType,
    query.vehicleId,
    query.q,
  ].filter((value) => value !== undefined).length;

  // El selector de vehículo se acota al universo elegido.
  const vehicles = query.vehicleType
    ? vehicleOptions.filter((option) => option.vehicleType === query.vehicleType)
    : vehicleOptions;

  const pages = Math.max(1, Math.ceil(total / query.limit));
  const subStatuses = inquiryViewStatuses[query.view];

  const emptyCopy: Record<InquiryView, { title: string; description: string }> = {
    activas: {
      title: "No hay solicitudes pendientes.",
      description: "Todo lo que ha llegado está cerrado o marcado como spam.",
    },
    cerradas: {
      title: "No hay solicitudes cerradas.",
      description: "Aquí quedan las que ya atendiste, por si hace falta consultarlas.",
    },
    spam: {
      title: "No hay solicitudes marcadas como spam.",
      description: "Lo que marques como spam aparecerá aquí.",
    },
  };

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <AdminPageHeader
        title="Solicitudes"
        subtitle="Lo que llega desde Contacto y desde las fichas de vehículo"
      />

      <div className={cn("grid gap-4", navigating && "opacity-60")} aria-busy={navigating}>
        {/* Bandejas */}
        <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
            {INQUIRY_VIEWS.map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => go({ view, status: undefined })}
                aria-current={query.view === view ? "page" : undefined}
                className={chip(query.view === view)}
              >
                {inquiryViewLabels[view]}{" "}
                <span className="opacity-60 tabular">{viewCount(view)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dentro de Activas: nuevas o contactadas */}
        {subStatuses.length > 1 ? (
          <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <div className="flex w-max items-center gap-2 sm:w-auto sm:flex-wrap">
              <button
                type="button"
                onClick={() => go({ status: undefined })}
                className={chip(!query.status)}
              >
                Todas
              </button>
              {subStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    go({ status: query.status === status ? undefined : status })
                  }
                  className={chip(query.status === status)}
                >
                  {statusBadge[status]}{" "}
                  <span className="opacity-60 tabular">{counts[status]}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Búsqueda y filtros */}
        <div className="grid gap-4 border border-stone bg-paper px-5 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              go({ q: search.trim() || undefined });
            }}
            className="grid gap-1.5"
          >
            <span className="eyebrow text-ink-muted/80">Buscar</span>
            <span className="relative block">
              <Search
                aria-hidden
                strokeWidth={1.4}
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Buscar por nombre, correo, teléfono o vehículo"
                placeholder="Nombre, correo o teléfono"
                className="h-10 w-full rounded-xs border border-stone bg-paper pr-3 pl-9 text-sm text-ink transition-colors placeholder:text-ink-muted/70 hover:border-stone-strong focus:border-burgundy focus:outline-none"
              />
            </span>
          </form>

          <Select
            label="Tipo de solicitud"
            value={query.type ?? ""}
            onChange={(value) =>
              go({ type: (value || undefined) as InquiryType | undefined })
            }
          >
            <option value="">Todas</option>
            {INQUIRY_TYPES.map((type) => (
              <option key={type} value={type}>
                {typeLabels[type]}
              </option>
            ))}
          </Select>

          <Select
            label="Tipo de vehículo"
            value={query.vehicleType ?? (query.vehicleId === "none" ? "none" : "")}
            onChange={(value) => {
              if (value === "none") {
                go({ vehicleType: undefined, vehicleId: "none" });
                return;
              }
              go({
                vehicleType: (value || undefined) as "auto" | "moto" | undefined,
                vehicleId: undefined,
              });
            }}
          >
            <option value="">Todos</option>
            {VEHICLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {typeLabel[type]}
              </option>
            ))}
            <option value="none">Sin vehículo asociado</option>
          </Select>

          <Select
            label="Vehículo"
            value={query.vehicleId && query.vehicleId !== "none" ? query.vehicleId : ""}
            onChange={(value) => go({ vehicleId: value || undefined })}
          >
            <option value="">Todos</option>
            {vehicles.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-serif text-sm text-ink-muted tabular">
            {total} {total === 1 ? "solicitud" : "solicitudes"}
            {activeCount > 0 ? " con estos filtros" : ""}
            {" en "}
            {inquiryViewLabels[query.view].toLowerCase()}
          </p>
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                startTransition(() =>
                  router.push(adminInquiriesHref({ view: query.view })),
                );
              }}
              className="label-caps inline-flex items-center gap-1.5 text-[10px] text-ink-muted underline underline-offset-4 transition-colors hover:text-burgundy"
            >
              Limpiar filtros
              <X aria-hidden className="size-3" strokeWidth={1.6} />
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-5 text-xs text-burgundy">
          {error}
        </p>
      ) : null}

      <div className="mt-6">
        {inquiries.length === 0 ? (
          <div className="border border-stone bg-paper">
            <EmptyState
              title={
                activeCount > 0
                  ? "No hay solicitudes con estos filtros."
                  : emptyCopy[query.view].title
              }
              description={
                activeCount > 0
                  ? "Prueba a quitar alguno."
                  : emptyCopy[query.view].description
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-stone border border-stone bg-paper">
            {inquiries.map((inquiry) => (
              <li
                key={inquiry.id}
                className={cn("px-5 py-5", busy === inquiry.id && "opacity-60")}
              >
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                  <div className="min-w-0">
                    <p className="font-serif text-[1.0625rem] text-ink">
                      {inquiry.name}
                    </p>
                    <p className="mt-1 font-serif text-sm text-ink-muted">
                      <a
                        href={`tel:${inquiry.phone.replace(/\s/g, "")}`}
                        className="transition-colors hover:text-burgundy"
                      >
                        {inquiry.phone}
                      </a>
                      {" · "}
                      <a
                        href={`mailto:${inquiry.email}`}
                        className="transition-colors hover:text-burgundy"
                      >
                        {inquiry.email}
                      </a>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="label-caps rounded-xs border border-stone px-2.5 py-1.5 text-[10px] text-ink-muted">
                      {typeLabels[inquiry.type]}
                    </span>
                    <span
                      className={cn(
                        "label-caps rounded-xs border px-2.5 py-1.5 text-[10px]",
                        statusPill[inquiry.status],
                      )}
                    >
                      {statusBadge[inquiry.status]}
                    </span>
                    <span className="font-serif text-xs text-ink-muted">
                      {formatDate(inquiry.createdAt)}
                    </span>
                  </div>
                </div>

                {inquiry.vehicleLabel ? (
                  <p className="mt-3 flex items-center gap-2 font-serif text-sm text-ink-soft">
                    {inquiry.vehicleType === "moto" ? (
                      <Bike aria-hidden className="size-4 text-ink-muted" strokeWidth={1.4} />
                    ) : (
                      <Car aria-hidden className="size-4 text-ink-muted" strokeWidth={1.4} />
                    )}
                    {inquiry.vehicleSlug ? (
                      <Link
                        href={`/vehiculos/${inquiry.vehicleSlug}`}
                        className="underline underline-offset-4 transition-colors hover:text-burgundy"
                      >
                        {inquiry.vehicleLabel}
                      </Link>
                    ) : (
                      <span>
                        {inquiry.vehicleLabel}
                        <span className="text-ink-muted"> · ya no está publicado</span>
                      </span>
                    )}
                  </p>
                ) : null}

                {inquiry.message ? (
                  <p className="mt-3 max-w-2xl font-serif text-[0.9375rem] leading-relaxed whitespace-pre-line text-ink-soft">
                    {inquiry.message}
                  </p>
                ) : null}

                <RowActions
                  inquiry={inquiry}
                  view={query.view}
                  busy={busy !== null}
                  onStatus={(id, status) => void setStatus(id, status)}
                  onDelete={(id, reason) => void remove(id, reason)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {pages > 1 ? (
        <div className="mt-6 flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={query.page <= 1}
            onClick={() =>
              startTransition(() =>
                router.push(adminInquiriesHref({ ...query, page: query.page - 1 })),
              )
            }
            className="label-caps rounded-xs border border-stone px-4 py-2 text-[10px] text-ink transition-colors hover:border-ink/40 disabled:opacity-35"
          >
            Anterior
          </button>
          <p className="font-serif text-sm text-ink-muted tabular">
            Página {query.page} de {pages}
          </p>
          <button
            type="button"
            disabled={query.page >= pages}
            onClick={() =>
              startTransition(() =>
                router.push(adminInquiriesHref({ ...query, page: query.page + 1 })),
              )
            }
            className="label-caps rounded-xs border border-stone px-4 py-2 text-[10px] text-ink transition-colors hover:border-ink/40 disabled:opacity-35"
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </div>
  );
}
