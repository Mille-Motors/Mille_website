"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, ShieldAlert, ShieldCheck } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import {
  ActiveFilters,
  AdminField,
  AdminInput,
  AdminSelect,
  Chip,
  ChipRow,
  EmptyPanel,
  FilterButton,
  FilterPanel,
  Notice,
  Pager,
  Panel,
  Pill,
  SearchBox,
  Spinner,
  buttonClass,
  buttonPrimaryClass,
  textareaClass,
} from "@/components/admin/kit";
import { PrivacyTabs } from "@/components/admin/PrivacyTabs";
import { adminJson } from "@/lib/admin-client";
import { adminPrivacyHref } from "@/lib/admin-urls";
import { cn } from "@/lib/cn";
import { formatDateOnly } from "@/lib/format";
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
 * este trabajo del de las consultas comerciales: aquí lo que no se atiende a
 * tiempo se incumple. Por eso el orden es por vencimiento y no por fecha de
 * llegada, y por eso lo vencido se ve antes de leer nada.
 */

const statusTone: Record<PrivacyRequestStatus, "success" | "info" | "neutral" | "warning"> = {
  received: "success",
  in_progress: "info",
  needs_info: "info",
  answered: "neutral",
  rejected: "warning",
  closed: "neutral",
};

const viewLabels: Record<PrivacyView, string> = {
  abiertas: "Abiertas",
  cerradas: "Cerradas",
  todas: "Todas",
};

/** «2026-10-05» se lee «5 de octubre de 2026». */
const civil = (value: string) => formatDateOnly(value) ?? value;

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
    return { text: `Cerrada · vencía el ${civil(request.dueOn)}`, tone: "text-ink-muted" };
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
    text: `Quedan ${days} ${days === 1 ? "día hábil" : "días hábiles"} · vence el ${civil(request.dueOn)}`,
    tone: days <= 3 ? "text-status-reserved" : "text-ink-muted",
  };
}

function RequestRow({
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
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-80">
          {/* Lo primero que se lee: en qué estado está y cuánto plazo queda. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Pill tone={statusTone[request.status]}>
              {PRIVACY_REQUEST_STATUS_LABELS[request.status]}
            </Pill>
            <span className={cn("text-[0.9375rem] font-medium tabular", deadline.tone)}>
              {deadline.text}
            </span>
            {!request.identityVerified ? (
              <Pill
                tone="info"
                icon={<ShieldAlert aria-hidden className="size-3.5" strokeWidth={1.6} />}
              >
                Identidad sin verificar
              </Pill>
            ) : null}
          </div>

          <p className="mt-2 text-base font-semibold text-ink">
            {request.titularName}
            <span className="font-normal text-ink-muted">
              {" "}
              · {PRIVACY_REQUEST_TYPE_LABELS[request.type]}
            </span>
          </p>
          <p className="mt-0.5 text-[0.9375rem] text-ink-muted">
            {[request.titularEmail, request.titularPhone].filter(Boolean).join(" · ")}
            {request.titularEmail || request.titularPhone ? " · " : ""}
            recibida el <span className="tabular">{civil(request.receivedOn)}</span> por{" "}
            {PRIVACY_REQUEST_CHANNEL_LABELS[request.channel]}
          </p>

          {request.subject ? (
            <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-soft">
              {request.subject}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className={cn(buttonClass, "px-4", !open && request.status === "received" && buttonPrimaryClass)}
        >
          {open ? "Cerrar" : "Atender"}
          <ChevronDown
            aria-hidden
            strokeWidth={1.6}
            className={cn("size-4 transition-transform duration-200", open && "rotate-180")}
          />
        </button>
      </div>

      {open ? (
        <div className="mt-4 grid gap-4 border-t border-stone pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Estado">
              <AdminSelect
                value={request.status}
                onChange={(value) => onPatch(request.id, { status: value })}
              >
                {PRIVACY_REQUEST_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PRIVACY_REQUEST_STATUS_LABELS[status]}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>

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
              <span className="text-[0.9375rem] text-ink-soft">
                Identidad del titular acreditada
              </span>
            </label>
          </div>

          <AdminField label="Notas internas">
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={textareaClass}
            />
          </AdminField>

          <AdminField label="Respuesta enviada al titular">
            <textarea
              rows={4}
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              className={textareaClass}
            />
          </AdminField>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onPatch(request.id, { notes, response })}
              className={cn(buttonClass, buttonPrimaryClass, "px-4")}
            >
              {busy ? <Spinner /> : null}
              Guardar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                onPatch(request.id, { notes, response, status: "answered" })
              }
              className={cn(buttonClass, "px-4")}
            >
              Guardar y marcar atendida
            </button>
          </div>

          {/* El fundamento legal, para quien lo necesite; no para cada lectura. */}
          <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
            Se tramita como {request.track}: plazo de {term.base} días hábiles ({term.article}).
            La identidad acreditada se exige por el art. 20 del Decreto 1377 de
            2013: sin ella no se entregan ni se borran datos.
          </p>
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
      className="mb-4 grid gap-4 rounded-xl border border-stone bg-sand/40 p-5"
    >
      <div>
        <h2 className="text-lg font-semibold text-ink">Registrar una solicitud</h2>
        <p className="mt-0.5 text-[0.9375rem] text-ink-muted">
          Lo que llegó por correo o WhatsApp. El vencimiento se calcula solo, en
          días hábiles colombianos, desde la fecha de recibo.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminField label="Derecho que ejerce">
          <AdminSelect name="type" defaultValue="access">
            {PRIVACY_REQUEST_TYPES.map((type) => (
              <option key={type} value={type}>
                {PRIVACY_REQUEST_TYPE_LABELS[type]}
              </option>
            ))}
          </AdminSelect>
        </AdminField>

        <AdminField label="Canal">
          <AdminSelect name="channel" defaultValue="email">
            {PRIVACY_REQUEST_CHANNELS.map((channel) => (
              <option key={channel} value={channel}>
                {PRIVACY_REQUEST_CHANNEL_LABELS[channel]}
              </option>
            ))}
          </AdminSelect>
        </AdminField>

        <AdminField label="Fecha de recibo">
          <AdminInput type="date" name="receivedOn" defaultValue={today} required />
        </AdminField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminField label="Nombre del titular">
          <AdminInput
            name="titularName"
            required
            aria-invalid={fields.titularName ? true : undefined}
          />
        </AdminField>
        <AdminField label="Correo">
          <AdminInput
            name="titularEmail"
            type="email"
            aria-invalid={fields.titularEmail ? true : undefined}
          />
        </AdminField>
        <AdminField label="Teléfono">
          <AdminInput name="titularPhone" type="tel" />
        </AdminField>
      </div>
      {fields.titularEmail ? (
        <p role="alert" className="text-[0.9375rem] text-burgundy">
          {fields.titularEmail}
        </p>
      ) : null}

      <AdminField label="Qué pide, en sus palabras">
        <textarea name="subject" rows={3} className={textareaClass} />
      </AdminField>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="identityVerified"
          className="mt-1 size-4 shrink-0 accent-burgundy"
        />
        <span className="text-[0.9375rem] text-ink-soft">
          La identidad del titular ya está acreditada. Sin esto no se entregan
          ni se borran datos: atender una supresión sin verificar quién la pide
          es borrarle los datos a alguien a petición de un tercero.
        </span>
      </label>

      <AdminField label="Cómo se acreditó (opcional)">
        <AdminInput name="identityNote" />
      </AdminField>

      {error ? (
        <p role="alert" className="text-[0.9375rem] text-burgundy">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy}
          className={cn(buttonClass, buttonPrimaryClass, "px-4")}
        >
          {busy ? <Spinner /> : null}
          {busy ? "Registrando…" : "Registrar solicitud"}
        </button>
        <button type="button" onClick={onCancel} className={cn(buttonClass, "px-4")}>
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
  const [panelOpen, setPanelOpen] = useState(
    query.type !== undefined ||
      query.status !== undefined ||
      query.channel !== undefined,
  );

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

  const panelCount = [query.type, query.status, query.channel].filter(
    (value) => value !== undefined,
  ).length;
  const activeCount = panelCount + (query.q !== undefined ? 1 : 0);

  const pages = Math.max(1, Math.ceil(total / query.limit));

  return (
    <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader
        eyebrow="Privacidad"
        title="Solicitudes de privacidad"
        subtitle="Lo que las personas piden sobre sus datos, con su plazo legal"
        action={
          <button
            type="button"
            onClick={() => setCreating((value) => !value)}
            className={cn(buttonClass, buttonPrimaryClass, "px-4")}
          >
            <Plus aria-hidden className="size-4" strokeWidth={1.8} />
            Registrar solicitud
          </button>
        }
      />

      <PrivacyTabs active="solicitudes" />

      {summary.overdue > 0 ? (
        <Notice
          className="mb-4"
          icon={<ShieldAlert aria-hidden className="size-5" strokeWidth={1.6} />}
        >
          Hay <span className="font-semibold tabular">{summary.overdue}</span>{" "}
          {summary.overdue === 1 ? "solicitud vencida" : "solicitudes vencidas"} de{" "}
          <span className="tabular">{summary.open}</span> abiertas. Atiéndelas primero.
        </Notice>
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

      <div className={cn("mb-4", navigating && "opacity-60")} aria-busy={navigating}>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox
            value={search}
            onChange={setSearch}
            onSubmit={() => go({ q: search.trim() || undefined })}
            label="Buscar por titular o asunto"
            placeholder="Buscar nombre, correo, teléfono o asunto…"
          />
          <FilterButton
            open={panelOpen}
            count={panelCount}
            controls="privacy-filter-panel"
            onClick={() => setPanelOpen((open) => !open)}
          />
          <ChipRow label="Bandeja" className="order-last xl:order-0 xl:m-0 xl:w-auto xl:overflow-visible xl:p-0">
            {PRIVACY_VIEWS.map((view) => (
              <Chip
                key={view}
                active={query.view === view}
                onClick={() => go({ view, status: undefined })}
              >
                {viewLabels[view]}
              </Chip>
            ))}
          </ChipRow>
        </div>

        {panelOpen ? (
          <FilterPanel id="privacy-filter-panel" className="lg:grid-cols-3">
            <AdminField label="Derecho">
              <AdminSelect
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
              </AdminSelect>
            </AdminField>

            <AdminField label="Estado">
              <AdminSelect
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
              </AdminSelect>
            </AdminField>

            <AdminField label="Canal">
              <AdminSelect
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
              </AdminSelect>
            </AdminField>
          </FilterPanel>
        ) : null}

        {activeCount > 0 ? (
          <ActiveFilters
            summary={`${total} ${total === 1 ? "solicitud" : "solicitudes"} con estos filtros`}
            onClear={() => {
              setSearch("");
              startTransition(() => router.push(adminPrivacyHref({})));
            }}
          />
        ) : null}
      </div>

      {error && !creating ? (
        <p role="alert" className="mb-4 text-[0.9375rem] text-burgundy">
          {error}
        </p>
      ) : null}

      <Panel className="overflow-hidden">
        {requests.length === 0 ? (
          <EmptyPanel
            icon={<ShieldCheck aria-hidden className="size-5" strokeWidth={1.5} />}
            title={
              activeCount > 0
                ? "Ninguna solicitud coincide con estos filtros"
                : "No hay solicitudes en esta bandeja"
            }
            description="Cuando alguien escriba pidiendo ver, corregir, revocar o borrar sus datos, regístralo aquí para que el plazo quede controlado."
          />
        ) : (
          <ul className="divide-y divide-stone">
            {requests.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                busy={busy}
                onPatch={patch}
              />
            ))}
          </ul>
        )}
      </Panel>

      <Pager
        page={query.page}
        pages={pages}
        total={total}
        shown={requests.length}
        limit={query.limit}
        noun={["solicitud", "solicitudes"]}
        pending={navigating}
        onPage={(page) =>
          startTransition(() => router.push(adminPrivacyHref({ ...query, page })))
        }
      />
    </div>
  );
}
