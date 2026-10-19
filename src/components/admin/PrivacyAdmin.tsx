"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Search, ShieldAlert, X } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { adminJson } from "@/lib/admin-client";
import { adminPrivacyHref } from "@/lib/admin-urls";
import { cn } from "@/lib/cn";
import {
  PRIVACY_REQUEST_CHANNELS,
  PRIVACY_REQUEST_CHANNEL_LABELS,
  PRIVACY_REQUEST_STATUSES,
  PRIVACY_REQUEST_STATUS_LABELS,
  PRIVACY_REQUEST_TERMS,
  PRIVACY_REQUEST_TYPES,
  PRIVACY_REQUEST_TYPE_LABELS,
  type PrivacyRequestStatus,
} from "@/lib/privacy-requests";
import type { AdminPrivacyQuery, PrivacyView } from "@/server/privacy/schemas";
import { PRIVACY_VIEWS } from "@/server/privacy/schemas";
import type { PrivacyRequestView } from "@/types/privacy";

/**
 * Los trámites de derechos del Titular.
 *
 * La pantalla está construida alrededor del PLAZO, porque es lo que distingue
 * esta bandeja de la de solicitudes comerciales: aquí lo que no se atiende a
 * tiempo se incumple. Por eso el orden es por vencimiento y no por fecha de
 * llegada, y por eso lo vencido se ve antes de leer nada.
 */

const selectClass =
  "h-10 w-full cursor-pointer appearance-none rounded-xs border border-stone bg-paper px-3 pr-8 text-sm text-ink transition-colors hover:border-stone-strong focus:border-burgundy focus:outline-none";

const inputClass =
  "h-10 w-full rounded-xs border border-stone bg-paper px-3 text-sm text-ink transition-colors hover:border-stone-strong focus:border-burgundy focus:outline-none";

const textareaClass =
  "w-full rounded-xs border border-stone bg-paper px-3 py-2 font-serif text-sm text-ink transition-colors hover:border-stone-strong focus:border-burgundy focus:outline-none";

const rowAction =
  "label-caps rounded-xs border border-stone px-3 py-1.5 text-[10px] text-ink transition-colors hover:border-ink/40 disabled:opacity-40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="eyebrow text-ink-muted/80">{label}</span>
      {children}
    </label>
  );
}

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
    <Field label={label}>
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
    </Field>
  );
}

const statusPill: Record<PrivacyRequestStatus, string> = {
  received: "border-status-available/30 bg-status-available/10 text-status-available",
  in_progress: "border-status-reserved/30 bg-status-reserved/10 text-status-reserved",
  needs_info: "border-status-reserved/30 bg-status-reserved/10 text-status-reserved",
  answered: "border-stone-strong/40 bg-sand text-ink-muted",
  rejected: "border-status-sold/30 bg-status-sold/10 text-status-sold",
  closed: "border-stone-strong/40 bg-sand text-ink-muted",
};

const viewLabels: Record<PrivacyView, string> = {
  abiertas: "Abiertas",
  cerradas: "Cerradas",
  todas: "Todas",
};

/**
 * Cómo se lee el plazo.
 *
 * El texto no depende solo del color: quien no distinga el rojo lee
 * «vencida hace 3 días hábiles» igual de claro. Es la misma regla que ya
 * siguen las insignias de publicación del inventario.
 */
function deadlineLabel(request: PrivacyRequestView): {
  text: string;
  tone: string;
} {
  if (request.businessDaysLeft === null) {
    return { text: `Cerrada · vencía el ${request.dueOn}`, tone: "text-ink-muted" };
  }
  const days = request.businessDaysLeft;
  if (days < 0) {
    return {
      text: `Vencida hace ${Math.abs(days)} ${Math.abs(days) === 1 ? "día hábil" : "días hábiles"}`,
      tone: "text-status-sold",
    };
  }
  if (days === 0) {
    return { text: "Vence hoy", tone: "text-status-sold" };
  }
  return {
    text: `Quedan ${days} ${days === 1 ? "día hábil" : "días hábiles"} · vence el ${request.dueOn}`,
    tone: days <= 3 ? "text-status-reserved" : "text-ink-muted",
  };
}

function RequestCard({
  request,
  busy,
  onPatch,
}: {
  request: PrivacyRequestView;
  busy: boolean;
  onPatch: (id: string, patch: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(request.notes ?? "");
  const [response, setResponse] = useState(request.response ?? "");
  const deadline = deadlineLabel(request);
  const term = PRIVACY_REQUEST_TERMS[request.track];

  return (
    <li className="border border-stone bg-paper px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "label-caps rounded-xs border px-2 py-1 text-[10px]",
                statusPill[request.status],
              )}
            >
              {PRIVACY_REQUEST_STATUS_LABELS[request.status]}
            </span>
            <span className={cn("font-serif text-sm tabular", deadline.tone)}>
              {deadline.text}
            </span>
            {!request.identityVerified ? (
              <span className="label-caps inline-flex items-center gap-1.5 rounded-xs border border-status-reserved/30 bg-status-reserved/10 px-2 py-1 text-[10px] text-status-reserved">
                <ShieldAlert aria-hidden className="size-3" strokeWidth={1.6} />
                Identidad sin verificar
              </span>
            ) : null}
          </div>

          <p className="mt-2 font-serif text-[0.9375rem] text-ink">
            {PRIVACY_REQUEST_TYPE_LABELS[request.type]} · {request.titularName}
          </p>
          <p className="mt-1 font-serif text-sm text-ink-muted">
            {[request.titularEmail, request.titularPhone]
              .filter(Boolean)
              .join(" · ")}{" "}
            · recibida el <span className="tabular">{request.receivedOn}</span>{" "}
            por {PRIVACY_REQUEST_CHANNEL_LABELS[request.channel]}
          </p>
          <p className="mt-1 font-serif text-xs text-ink-muted">
            Se tramita como {request.track} · plazo de {term.base} días hábiles
            ({term.article})
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className={rowAction}
        >
          {open ? "Cerrar" : "Atender"}
        </button>
      </div>

      {request.subject ? (
        <p className="mt-3 border-l-2 border-stone pl-3 font-serif text-sm leading-relaxed text-ink-soft">
          {request.subject}
        </p>
      ) : null}

      {open ? (
        <div className="mt-4 grid gap-4 border-t border-stone pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Estado"
              value={request.status}
              onChange={(value) => onPatch(request.id, { status: value })}
            >
              {PRIVACY_REQUEST_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PRIVACY_REQUEST_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>

            <label className="flex items-end gap-3 pb-2">
              <input
                type="checkbox"
                checked={request.identityVerified}
                disabled={busy}
                onChange={(event) =>
                  onPatch(request.id, { identityVerified: event.target.checked })
                }
                className="size-4 shrink-0 accent-burgundy"
              />
              <span className="font-serif text-sm text-ink-soft">
                Identidad del titular acreditada (art. 20 del Decreto 1377 de
                2013)
              </span>
            </label>
          </div>

          <Field label="Notas internas">
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={textareaClass}
            />
          </Field>

          <Field label="Respuesta enviada al titular">
            <textarea
              rows={4}
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              className={textareaClass}
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onPatch(request.id, { notes, response })}
              className="label-caps rounded-xs bg-burgundy px-4 py-2 text-[10px] text-cream disabled:opacity-40"
            >
              Guardar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                onPatch(request.id, { notes, response, status: "answered" })
              }
              className={rowAction}
            >
              Guardar y marcar atendida
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

/** El formulario de registro: lo rellena el equipo con lo que llegó. */
function NewRequestForm({
  busy,
  error,
  fields,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
  error: string | null;
  fields: Record<string, string>;
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
}) {
  // Por defecto, hoy: lo normal es registrar lo que acaba de llegar. Se puede
  // corregir, porque el plazo cuelga de la fecha de RECIBO y no de la de
  // registro, y una solicitud del viernes anotada el lunes ya lleva días.
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSubmit({
          type: data.get("type"),
          channel: data.get("channel"),
          receivedOn: data.get("receivedOn"),
          titularName: String(data.get("titularName") ?? ""),
          titularEmail: String(data.get("titularEmail") ?? ""),
          titularPhone: String(data.get("titularPhone") ?? ""),
          identityVerified: data.get("identityVerified") === "on",
          identityNote: String(data.get("identityNote") ?? ""),
          subject: String(data.get("subject") ?? ""),
        });
      }}
      className="grid gap-4 border border-stone bg-sand/40 px-5 py-5"
    >
      <h2 className="font-display text-xl text-ink">Registrar una solicitud</h2>
      <p className="font-serif text-sm text-ink-muted">
        Lo que llegó por correo o WhatsApp. El vencimiento se calcula solo, en
        días hábiles colombianos, desde la fecha de recibo.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Derecho que ejerce">
          <span className="relative block">
            <select name="type" defaultValue="access" className={selectClass}>
              {PRIVACY_REQUEST_TYPES.map((type) => (
                <option key={type} value={type}>
                  {PRIVACY_REQUEST_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              strokeWidth={1.5}
              className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-muted"
            />
          </span>
        </Field>

        <Field label="Canal">
          <span className="relative block">
            <select name="channel" defaultValue="email" className={selectClass}>
              {PRIVACY_REQUEST_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {PRIVACY_REQUEST_CHANNEL_LABELS[channel]}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              strokeWidth={1.5}
              className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-muted"
            />
          </span>
        </Field>

        <Field label="Fecha de recibo">
          <input
            type="date"
            name="receivedOn"
            defaultValue={today}
            required
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Nombre del titular">
          <input
            name="titularName"
            required
            className={inputClass}
            aria-invalid={fields.titularName ? true : undefined}
          />
        </Field>
        <Field label="Correo">
          <input
            name="titularEmail"
            type="email"
            className={inputClass}
            aria-invalid={fields.titularEmail ? true : undefined}
          />
        </Field>
        <Field label="Teléfono">
          <input name="titularPhone" type="tel" className={inputClass} />
        </Field>
      </div>
      {fields.titularEmail ? (
        <p role="alert" className="font-serif text-sm text-burgundy">
          {fields.titularEmail}
        </p>
      ) : null}

      <Field label="Qué pide, en sus palabras">
        <textarea name="subject" rows={3} className={textareaClass} />
      </Field>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="identityVerified"
          className="mt-1 size-4 shrink-0 accent-burgundy"
        />
        <span className="font-serif text-sm text-ink-soft">
          La identidad del titular ya está acreditada. Sin esto no se entregan
          ni se borran datos: atender una supresión sin verificar quién la pide
          es borrarle los datos a alguien a petición de un tercero.
        </span>
      </label>

      <Field label="Cómo se acreditó (opcional)">
        <input name="identityNote" className={inputClass} />
      </Field>

      {error ? (
        <p role="alert" className="font-serif text-sm text-burgundy">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy}
          className="label-caps rounded-xs bg-burgundy px-4 py-2.5 text-[10px] text-cream disabled:opacity-40"
        >
          {busy ? "Registrando…" : "Registrar solicitud"}
        </button>
        <button type="button" onClick={onCancel} className={rowAction}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function PrivacyAdmin({
  requests,
  total,
  summary,
  query,
}: {
  requests: PrivacyRequestView[];
  total: number;
  summary: { open: number; overdue: number };
  query: AdminPrivacyQuery;
}) {
  const router = useRouter();
  const [navigating, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState(query.q ?? "");

  const [seenQ, setSeenQ] = useState(query.q);
  if (seenQ !== query.q) {
    setSeenQ(query.q);
    setSearch(query.q ?? "");
  }

  function go(patch: Partial<AdminPrivacyQuery>) {
    startTransition(() =>
      router.push(adminPrivacyHref({ ...query, ...patch, page: 1 })),
    );
  }

  async function patch(id: string, body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await adminJson(`/api/admin/privacy-requests/${id}`, "PATCH", body);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  async function create(values: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setFields({});
    const result = await adminJson("/api/admin/privacy-requests", "POST", values);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      setFields(result.fields ?? {});
      return;
    }
    setCreating(false);
    router.refresh();
  }

  const chip = (active: boolean) =>
    cn(
      "label-caps inline-flex items-center gap-2 rounded-xs border px-3.5 py-2 text-[10px] transition-colors",
      active
        ? "border-burgundy bg-burgundy text-cream"
        : "border-stone text-ink-soft hover:border-stone-strong",
    );

  const activeCount = [query.type, query.status, query.channel, query.q].filter(
    (value) => value !== undefined,
  ).length;

  const pages = Math.max(1, Math.ceil(total / query.limit));

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <AdminPageHeader
        title="Solicitudes de privacidad"
        subtitle="Derechos que ejercen los titulares, con sus plazos legales"
        action={
          <button
            type="button"
            onClick={() => setCreating((value) => !value)}
            className="label-caps inline-flex items-center gap-2 rounded-xs bg-burgundy px-4 py-2.5 text-[10px] text-cream"
          >
            <Plus aria-hidden className="size-3.5" strokeWidth={1.6} />
            Registrar solicitud
          </button>
        }
      />

      <div className={cn("grid gap-4", navigating && "opacity-60")} aria-busy={navigating}>
        {summary.overdue > 0 ? (
          <p
            role="status"
            className="inline-flex items-center gap-2 border border-status-sold/30 bg-status-sold/10 px-4 py-3 font-serif text-sm text-status-sold"
          >
            <ShieldAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.6} />
            <span>
              Hay <span className="tabular">{summary.overdue}</span>{" "}
              {summary.overdue === 1 ? "solicitud vencida" : "solicitudes vencidas"}{" "}
              de <span className="tabular">{summary.open}</span> abiertas.
            </span>
          </p>
        ) : null}

        {creating ? (
          <NewRequestForm
            busy={busy}
            error={error}
            fields={fields}
            onCancel={() => setCreating(false)}
            onSubmit={create}
          />
        ) : null}

        <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
            {PRIVACY_VIEWS.map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => go({ view, status: undefined })}
                aria-current={query.view === view ? "page" : undefined}
                className={chip(query.view === view)}
              >
                {viewLabels[view]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 border border-stone bg-sand/40 px-4 py-4 sm:grid-cols-3">
          <Select
            label="Derecho"
            value={query.type ?? ""}
            onChange={(value) =>
              go({ type: (value || undefined) as AdminPrivacyQuery["type"] })
            }
          >
            <option value="">Todos</option>
            {PRIVACY_REQUEST_TYPES.map((type) => (
              <option key={type} value={type}>
                {PRIVACY_REQUEST_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>

          <Select
            label="Estado"
            value={query.status ?? ""}
            onChange={(value) =>
              go({ status: (value || undefined) as AdminPrivacyQuery["status"] })
            }
          >
            <option value="">Todos</option>
            {PRIVACY_REQUEST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PRIVACY_REQUEST_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>

          <Select
            label="Canal"
            value={query.channel ?? ""}
            onChange={(value) =>
              go({ channel: (value || undefined) as AdminPrivacyQuery["channel"] })
            }
          >
            <option value="">Todos</option>
            {PRIVACY_REQUEST_CHANNELS.map((channel) => (
              <option key={channel} value={channel}>
                {PRIVACY_REQUEST_CHANNEL_LABELS[channel]}
              </option>
            ))}
          </Select>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            go({ q: search.trim() || undefined });
          }}
          className="flex gap-2"
        >
          <label className="relative flex-1">
            <span className="sr-only">Buscar por titular o asunto</span>
            <Search
              aria-hidden
              strokeWidth={1.5}
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, correo, teléfono o asunto"
              className={cn(inputClass, "pl-9")}
            />
          </label>
          <button
            type="submit"
            className="label-caps rounded-xs border border-stone bg-paper px-4 text-[10px] text-ink transition-colors hover:border-ink/40"
          >
            Buscar
          </button>
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={() => startTransition(() => router.push(adminPrivacyHref({})))}
              className="label-caps inline-flex items-center gap-1.5 rounded-xs border border-stone bg-paper px-4 text-[10px] text-ink-muted transition-colors hover:border-ink/40"
            >
              <X aria-hidden className="size-3" strokeWidth={1.5} />
              Limpiar
            </button>
          ) : null}
        </form>

        {error && !creating ? (
          <p role="alert" className="font-serif text-sm text-burgundy">
            {error}
          </p>
        ) : null}

        {requests.length === 0 ? (
          <EmptyState
            title="No hay solicitudes con ese filtro."
            description="Cuando alguien escriba al canal de atención pidiendo acceder, rectificar, revocar o suprimir sus datos, regístralo aquí para que el plazo quede controlado."
          />
        ) : (
          <>
            <ul className="grid gap-2">
              {requests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  busy={busy}
                  onPatch={patch}
                />
              ))}
            </ul>

            {pages > 1 ? (
              <div className="flex items-center justify-between gap-4 pt-2">
                <p className="font-serif text-sm text-ink-muted">
                  Página <span className="tabular">{query.page}</span> de{" "}
                  <span className="tabular">{pages}</span> ·{" "}
                  <span className="tabular">{total}</span> solicitudes
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={query.page <= 1}
                    onClick={() =>
                      startTransition(() =>
                        router.push(adminPrivacyHref({ ...query, page: query.page - 1 })),
                      )
                    }
                    className={cn(rowAction, "px-4 py-2")}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={query.page >= pages}
                    onClick={() =>
                      startTransition(() =>
                        router.push(adminPrivacyHref({ ...query, page: query.page + 1 })),
                      )
                    }
                    className={cn(rowAction, "px-4 py-2")}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
