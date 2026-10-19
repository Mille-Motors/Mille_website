"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Download,
  Fingerprint,
  Search,
  ShieldCheck,
  ShieldOff,
  X,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { adminConsentExportHref, adminConsentHref } from "@/lib/admin-urls";
import { cn } from "@/lib/cn";
import {
  CONSENT_ACTIONS,
  CONSENT_ACTION_LABELS,
  CONSENT_SOURCE_ADMIN,
  CONSENT_TYPES,
  CONSENT_TYPE_LABELS,
  consentSourceLabel,
  type ConsentAction,
} from "@/lib/consent";
import type { AdminConsentQuery } from "@/server/consent/schemas";
import type { ConsentEventView } from "@/types/consent";

/**
 * La evidencia de consentimiento.
 *
 * No es una pantalla con un sello que diga «cumplimos»: es la lista de lo que
 * de verdad se puede demostrar, con lo que falta dicho en voz alta. Un evento
 * heredado de la primera forma de la prueba lo anuncia —«sin prueba del
 * texto»— en vez de aparentar ser igual que los demás.
 *
 * Nada de aquí se puede editar, y no es una decisión de la interfaz: la tabla
 * tiene un trigger que rechaza cualquier UPDATE o DELETE. La única acción que
 * modifica el estado de alguien es registrar una revocatoria, y eso AÑADE un
 * evento.
 */

const selectClass =
  "h-10 w-full cursor-pointer appearance-none rounded-xs border border-stone bg-paper px-3 pr-8 text-sm text-ink transition-colors hover:border-stone-strong focus:border-burgundy focus:outline-none";

const inputClass =
  "h-10 w-full rounded-xs border border-stone bg-paper px-3 text-sm text-ink transition-colors hover:border-stone-strong focus:border-burgundy focus:outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
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

const actionPill: Record<ConsentAction, string> = {
  granted: "border-status-available/30 bg-status-available/10 text-status-available",
  revoked: "border-status-sold/30 bg-status-sold/10 text-status-sold",
};

const ActionIcon = {
  granted: ShieldCheck,
  revoked: ShieldOff,
} as const;

/** Fecha y hora en Bogotá, que es donde atiende el equipo. */
function stamp(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Row({ event }: { event: ConsentEventView }) {
  const [open, setOpen] = useState(false);
  const Icon = ActionIcon[event.action];

  /**
   * El evento lo registró el equipo, no la persona.
   *
   * Es así como se crean las revocatorias: llegan por correo o WhatsApp y
   * alguien las anota. La decisión sigue siendo del Titular —por eso está en
   * esta tabla— pero los datos técnicos de la petición son del equipo, y eso
   * cambia cómo hay que leer la IP y el agente de usuario.
   */
  const registeredByTeam = event.source === CONSENT_SOURCE_ADMIN;

  return (
    <li className="border border-stone bg-paper px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "label-caps inline-flex items-center gap-1.5 rounded-xs border px-2 py-1 text-[10px]",
                actionPill[event.action],
              )}
            >
              <Icon aria-hidden className="size-3" strokeWidth={1.6} />
              {CONSENT_ACTION_LABELS[event.action]}
            </span>
            <span className="font-serif text-sm text-ink-muted tabular">
              {stamp(event.createdAt)}
            </span>
            {!event.textEvidenceAvailable ? (
              <span className="label-caps rounded-xs border border-stone-strong/40 bg-sand px-2 py-1 text-[10px] text-ink-muted">
                Heredado · sin prueba del texto
              </span>
            ) : null}
          </div>

          <p className="mt-2 font-serif text-[0.9375rem] text-ink">
            {event.titular ? (
              <>
                {event.titular.name}
                {event.titular.email ? (
                  <span className="text-ink-muted"> · {event.titular.email}</span>
                ) : null}
                {event.titular.phone ? (
                  <span className="text-ink-muted"> · {event.titular.phone}</span>
                ) : null}
              </>
            ) : (
              // El enlace quedó nulo porque la solicitud se borró. El evento
              // sigue probando que hubo una autorización; a quién se refería
              // ya no está en la base, y eso es lo correcto.
              <span className="text-ink-muted italic">
                Solicitud eliminada · el evento se conserva sin titular enlazado
              </span>
            )}
          </p>

          <p className="mt-1 font-serif text-sm text-ink-muted">
            {CONSENT_TYPE_LABELS[event.consentType]} ·{" "}
            {consentSourceLabel(event.source)} · política{" "}
            <span className="tabular">{event.policyVersion}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="label-caps inline-flex shrink-0 items-center gap-1.5 rounded-xs border border-stone px-3 py-1.5 text-[10px] text-ink transition-colors hover:border-ink/40"
        >
          <Fingerprint aria-hidden className="size-3" strokeWidth={1.5} />
          {open ? "Ocultar evidencia" : "Ver evidencia"}
        </button>
      </div>

      {open ? (
        <dl className="mt-4 grid gap-3 border-t border-stone pt-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="eyebrow text-ink-muted/80">Texto que se mostró</dt>
            <dd className="mt-1 font-serif text-sm leading-relaxed text-ink-soft">
              {event.textSnapshot ?? (
                <span className="italic text-ink-muted">
                  No se conserva. Este evento viene de la primera forma de la
                  prueba, que registraba la versión de la política pero no el
                  texto. No se rellena con el texto actual: sería fabricar la
                  prueba de que alguien leyó algo que entonces no existía.
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-ink-muted/80">Versión del texto</dt>
            <dd className="mt-1 font-serif text-sm text-ink-soft tabular">
              {event.textVersion ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-ink-muted/80">Huella SHA-256</dt>
            <dd className="mt-1 font-serif text-xs break-all text-ink-soft tabular">
              {event.textHash ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-ink-muted/80">
              {/* Una revocatoria la teclea el equipo cuando llega por el canal
                  de atención, así que la IP de esa petición es la del equipo y
                  NO la del titular. Sin decirlo, alguien la leería mañana como
                  si lo fuera. */}
              {registeredByTeam
                ? "IP del equipo que lo registró"
                : "IP del titular"}
            </dt>
            <dd className="mt-1 font-serif text-sm text-ink-soft tabular">
              {event.ipAddress ?? "—"}
              {event.ipSource ? (
                <span className="text-ink-muted"> · {event.ipSource}</span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-ink-muted/80">Identificador de petición</dt>
            <dd className="mt-1 font-serif text-xs break-all text-ink-soft">
              {event.requestId ?? "—"}
            </dd>
          </div>
          {event.userAgent ? (
            <div className="sm:col-span-2">
              <dt className="eyebrow text-ink-muted/80">
                {registeredByTeam
                  ? "Agente de usuario del equipo"
                  : "Agente de usuario del titular"}
              </dt>
              <dd className="mt-1 font-serif text-xs break-all text-ink-soft">
                {event.userAgent}
              </dd>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <dt className="eyebrow text-ink-muted/80">Identificador del evento</dt>
            <dd className="mt-1 font-serif text-xs break-all text-ink-soft tabular">
              {event.id}
            </dd>
          </div>
        </dl>
      ) : null}
    </li>
  );
}

export function ConsentAdmin({
  events,
  total,
  counts,
  sources,
  query,
}: {
  events: ConsentEventView[];
  total: number;
  counts: Record<ConsentAction, number>;
  sources: string[];
  query: AdminConsentQuery;
}) {
  const router = useRouter();
  const [navigating, startTransition] = useTransition();
  const [search, setSearch] = useState(query.q ?? "");

  const [seenQ, setSeenQ] = useState(query.q);
  if (seenQ !== query.q) {
    setSeenQ(query.q);
    setSearch(query.q ?? "");
  }

  function go(patch: Partial<AdminConsentQuery>) {
    startTransition(() =>
      router.push(adminConsentHref({ ...query, ...patch, page: 1 })),
    );
  }

  const activeCount = [
    query.type,
    query.action,
    query.source,
    query.from,
    query.to,
    query.q,
  ].filter((value) => value !== undefined).length;

  const pages = Math.max(1, Math.ceil(total / query.limit));

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <AdminPageHeader
        title="Consentimientos"
        subtitle="Qué autorizó cada persona, con qué texto y desde dónde"
        action={
          // Enlace y no botón: es una descarga, y el navegador ya sabe
          // descargar. La URL lleva el MISMO filtro que la pantalla, así que
          // lo que se exporta es lo que se está viendo.
          <a
            href={adminConsentExportHref(query)}
            className="label-caps inline-flex items-center gap-2 rounded-xs border border-stone bg-paper px-4 py-2.5 text-[10px] text-ink transition-colors hover:border-ink/40"
          >
            <Download aria-hidden className="size-3.5" strokeWidth={1.5} />
            Exportar CSV
          </a>
        }
      />

      <div className={cn("grid gap-4", navigating && "opacity-60")} aria-busy={navigating}>
        <p className="font-serif text-sm text-ink-muted">
          <span className="tabular">{counts.granted}</span> autorizaciones y{" "}
          <span className="tabular">{counts.revoked}</span> revocatorias
          registradas. Los eventos no se editan ni se borran: la base lo
          impide, y una revocatoria se registra como un evento nuevo.
        </p>

        <div className="grid gap-3 border border-stone bg-sand/40 px-4 py-4 sm:grid-cols-2 lg:grid-cols-5">
          <Select
            label="Tipo"
            value={query.type ?? ""}
            onChange={(value) =>
              go({ type: (value || undefined) as AdminConsentQuery["type"] })
            }
          >
            <option value="">Todos</option>
            {CONSENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {CONSENT_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>

          <Select
            label="Acción"
            value={query.action ?? ""}
            onChange={(value) =>
              go({ action: (value || undefined) as AdminConsentQuery["action"] })
            }
          >
            <option value="">Todas</option>
            {CONSENT_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {CONSENT_ACTION_LABELS[action]}
              </option>
            ))}
          </Select>

          <Select
            label="Origen"
            value={query.source ?? ""}
            onChange={(value) => go({ source: value || undefined })}
          >
            <option value="">Todos</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {consentSourceLabel(source)}
              </option>
            ))}
          </Select>

          <Field label="Desde">
            <input
              type="date"
              value={query.from ?? ""}
              onChange={(event) => go({ from: event.target.value || undefined })}
              className={inputClass}
            />
          </Field>

          <Field label="Hasta">
            <input
              type="date"
              value={query.to ?? ""}
              onChange={(event) => go({ to: event.target.value || undefined })}
              className={inputClass}
            />
          </Field>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            go({ q: search.trim() || undefined });
          }}
          className="flex gap-2"
        >
          <label className="relative flex-1">
            <span className="sr-only">
              Buscar por titular, origen, versión, huella o IP
            </span>
            <Search
              aria-hidden
              strokeWidth={1.5}
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Titular, origen, versión, huella o IP"
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
              onClick={() => startTransition(() => router.push(adminConsentHref({})))}
              className="label-caps inline-flex items-center gap-1.5 rounded-xs border border-stone bg-paper px-4 text-[10px] text-ink-muted transition-colors hover:border-ink/40"
            >
              <X aria-hidden className="size-3" strokeWidth={1.5} />
              Limpiar
            </button>
          ) : null}
        </form>

        {events.length === 0 ? (
          <EmptyState
            title="No hay eventos con ese filtro."
            description="Los eventos se escriben cuando alguien envía un formulario público o cuando el equipo registra una revocatoria."
          />
        ) : (
          <>
            <ul className="grid gap-2">
              {events.map((event) => (
                <Row key={event.id} event={event} />
              ))}
            </ul>

            {pages > 1 ? (
              <div className="flex items-center justify-between gap-4 pt-2">
                <p className="font-serif text-sm text-ink-muted">
                  Página <span className="tabular">{query.page}</span> de{" "}
                  <span className="tabular">{pages}</span> ·{" "}
                  <span className="tabular">{total}</span> eventos
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={query.page <= 1}
                    onClick={() =>
                      startTransition(() =>
                        router.push(
                          adminConsentHref({ ...query, page: query.page - 1 }),
                        ),
                      )
                    }
                    className="label-caps rounded-xs border border-stone bg-paper px-4 py-2 text-[10px] text-ink transition-colors hover:border-ink/40 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={query.page >= pages}
                    onClick={() =>
                      startTransition(() =>
                        router.push(
                          adminConsentHref({ ...query, page: query.page + 1 }),
                        ),
                      )
                    }
                    className="label-caps rounded-xs border border-stone bg-paper px-4 py-2 text-[10px] text-ink transition-colors hover:border-ink/40 disabled:opacity-40"
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
