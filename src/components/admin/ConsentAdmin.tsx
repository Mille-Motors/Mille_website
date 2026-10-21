"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Download, Fingerprint, ShieldCheck, ShieldOff } from "lucide-react";
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
  Pager,
  Panel,
  Pill,
  SearchBox,
  buttonClass,
} from "@/components/admin/kit";
import { PrivacyTabs } from "@/components/admin/PrivacyTabs";
import { adminConsentExportHref, adminConsentHref } from "@/lib/admin-urls";
import { cn } from "@/lib/cn";
import { formatDateTimeLong } from "@/lib/format";
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

const actionTone: Record<ConsentAction, "success" | "warning"> = {
  granted: "success",
  revoked: "warning",
};

const ActionIcon = {
  granted: ShieldCheck,
  revoked: ShieldOff,
} as const;

/** Un dato de la ficha de evidencia: su nombre, y debajo el valor. */
function Datum({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <dt className="text-[0.8125rem] font-medium text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-[0.9375rem] text-ink-soft">{children}</dd>
    </div>
  );
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
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-80">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Pill
              tone={actionTone[event.action]}
              icon={<Icon aria-hidden className="size-3.5" strokeWidth={1.6} />}
            >
              {CONSENT_ACTION_LABELS[event.action]}
            </Pill>
            <span className="text-[0.9375rem] text-ink-muted tabular">
              {formatDateTimeLong(event.createdAt)}
            </span>
            {!event.textEvidenceAvailable ? (
              <Pill>Heredado · sin prueba del texto</Pill>
            ) : null}
          </div>

          <p className="mt-2 text-base font-semibold text-ink">
            {event.titular ? (
              <>
                {event.titular.name}
                {event.titular.email ? (
                  <span className="font-normal text-ink-muted"> · {event.titular.email}</span>
                ) : null}
                {event.titular.phone ? (
                  <span className="font-normal text-ink-muted"> · {event.titular.phone}</span>
                ) : null}
              </>
            ) : (
              // El enlace quedó nulo porque la solicitud se borró. El evento
              // sigue probando que hubo una autorización; a quién se refería
              // ya no está en la base, y eso es lo correcto.
              <span className="font-normal text-ink-muted italic">
                Consulta eliminada · el evento se conserva sin titular enlazado
              </span>
            )}
          </p>

          <p className="mt-0.5 text-[0.9375rem] text-ink-muted">
            {CONSENT_TYPE_LABELS[event.consentType]} ·{" "}
            {consentSourceLabel(event.source)} · política{" "}
            <span className="tabular">{event.policyVersion}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className={cn(buttonClass, "shrink-0 px-3.5")}
        >
          <Fingerprint aria-hidden className="size-4" strokeWidth={1.5} />
          {open ? "Ocultar evidencia" : "Ver evidencia"}
          <ChevronDown
            aria-hidden
            strokeWidth={1.6}
            className={cn("size-4 transition-transform duration-200", open && "rotate-180")}
          />
        </button>
      </div>

      {open ? (
        <dl className="mt-4 grid gap-x-6 gap-y-3.5 border-t border-stone pt-4 sm:grid-cols-2">
          <Datum label="Texto que se mostró" className="sm:col-span-2">
            <span className="leading-relaxed">
              {event.textSnapshot ?? (
                <span className="text-ink-muted italic">
                  No se conserva. Este evento viene de la primera forma de la
                  prueba, que registraba la versión de la política pero no el
                  texto. No se rellena con el texto actual: sería fabricar la
                  prueba de que alguien leyó algo que entonces no existía.
                </span>
              )}
            </span>
          </Datum>
          <Datum label="Versión del texto">
            <span className="tabular">{event.textVersion ?? "—"}</span>
          </Datum>
          <Datum label="Huella SHA-256">
            <span className="text-sm break-all tabular">{event.textHash ?? "—"}</span>
          </Datum>
          <Datum
            // Una revocatoria la teclea el equipo cuando llega por el canal de
            // atención, así que la IP de esa petición es la del equipo y NO la
            // del titular. Sin decirlo, alguien la leería mañana como si lo
            // fuera.
            label={registeredByTeam ? "IP del equipo que lo registró" : "IP del titular"}
          >
            <span className="tabular">
              {event.ipAddress ?? "—"}
              {event.ipSource ? (
                <span className="text-ink-muted"> · {event.ipSource}</span>
              ) : null}
            </span>
          </Datum>
          <Datum label="Identificador de petición">
            <span className="text-sm break-all">{event.requestId ?? "—"}</span>
          </Datum>
          {event.userAgent ? (
            <Datum
              label={
                registeredByTeam
                  ? "Agente de usuario del equipo"
                  : "Agente de usuario del titular"
              }
              className="sm:col-span-2"
            >
              <span className="text-sm break-all">{event.userAgent}</span>
            </Datum>
          ) : null}
          <Datum label="Identificador del evento" className="sm:col-span-2">
            <span className="text-sm break-all tabular">{event.id}</span>
          </Datum>
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
  const [panelOpen, setPanelOpen] = useState(
    query.type !== undefined ||
      query.source !== undefined ||
      query.from !== undefined ||
      query.to !== undefined,
  );

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

  // La acción tiene sus propios chips; lo que queda en el panel es el resto.
  const panelCount = [query.type, query.source, query.from ?? query.to].filter(
    (value) => value !== undefined,
  ).length;
  const activeCount =
    panelCount + (query.action !== undefined ? 1 : 0) + (query.q !== undefined ? 1 : 0);

  const pages = Math.max(1, Math.ceil(total / query.limit));

  return (
    <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader
        eyebrow="Privacidad"
        title="Consentimientos"
        subtitle="Qué autorizó cada persona, con qué texto y desde dónde"
        action={
          // Enlace y no botón: es una descarga, y el navegador ya sabe
          // descargar. La URL lleva el MISMO filtro que la pantalla, así que
          // lo que se exporta es lo que se está viendo.
          <a
            href={adminConsentExportHref(query)}
            className={cn(buttonClass, "px-4")}
          >
            <Download aria-hidden className="size-4" strokeWidth={1.5} />
            Exportar CSV
          </a>
        }
      />

      <PrivacyTabs active="consentimientos" />

      <div className={cn("mb-4", navigating && "opacity-60")} aria-busy={navigating}>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox
            value={search}
            onChange={setSearch}
            onSubmit={() => go({ q: search.trim() || undefined })}
            label="Buscar por titular, origen, versión, huella o IP"
            placeholder="Buscar titular, origen, versión o IP…"
          />
          <FilterButton
            open={panelOpen}
            count={panelCount}
            controls="consent-filter-panel"
            onClick={() => setPanelOpen((open) => !open)}
          />
          <ChipRow label="Acción" className="order-last xl:order-0 xl:m-0 xl:w-auto xl:overflow-visible xl:p-0">
            <Chip active={!query.action} onClick={() => go({ action: undefined })}>
              Todos
            </Chip>
            {CONSENT_ACTIONS.map((action) => (
              <Chip
                key={action}
                active={query.action === action}
                count={counts[action]}
                onClick={() =>
                  go({ action: query.action === action ? undefined : action })
                }
              >
                {CONSENT_ACTION_LABELS[action]}
              </Chip>
            ))}
          </ChipRow>
        </div>

        {panelOpen ? (
          <FilterPanel id="consent-filter-panel" className="lg:grid-cols-4">
            <AdminField label="Tipo">
              <AdminSelect
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
              </AdminSelect>
            </AdminField>

            <AdminField label="Origen">
              <AdminSelect
                value={query.source ?? ""}
                onChange={(value) => go({ source: value || undefined })}
              >
                <option value="">Todos</option>
                {sources.map((source) => (
                  <option key={source} value={source}>
                    {consentSourceLabel(source)}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>

            <AdminField label="Desde">
              <AdminInput
                type="date"
                value={query.from ?? ""}
                onChange={(event) => go({ from: event.target.value || undefined })}
              />
            </AdminField>

            <AdminField label="Hasta">
              <AdminInput
                type="date"
                value={query.to ?? ""}
                onChange={(event) => go({ to: event.target.value || undefined })}
              />
            </AdminField>
          </FilterPanel>
        ) : null}

        {activeCount > 0 ? (
          <ActiveFilters
            summary={`${total} ${total === 1 ? "evento" : "eventos"} con estos filtros`}
            onClear={() => {
              setSearch("");
              startTransition(() => router.push(adminConsentHref({})));
            }}
          />
        ) : null}
      </div>

      <Panel className="overflow-hidden">
        {events.length === 0 ? (
          <EmptyPanel
            icon={<ShieldCheck aria-hidden className="size-5" strokeWidth={1.5} />}
            title={
              activeCount > 0
                ? "Ningún evento coincide con estos filtros"
                : "Todavía no hay eventos"
            }
            description="Los eventos se escriben cuando alguien envía un formulario público o cuando el equipo registra una revocatoria."
          />
        ) : (
          <ul className="divide-y divide-stone">
            {events.map((event) => (
              <Row key={event.id} event={event} />
            ))}
          </ul>
        )}
      </Panel>

      <Pager
        page={query.page}
        pages={pages}
        total={total}
        shown={events.length}
        limit={query.limit}
        noun={["evento", "eventos"]}
        pending={navigating}
        onPage={(page) =>
          startTransition(() => router.push(adminConsentHref({ ...query, page })))
        }
      />

      <p className="mt-6 max-w-2xl text-[0.8125rem] leading-relaxed text-ink-muted">
        Los eventos no se editan ni se borran: la base de datos lo impide. Una
        revocatoria se registra como un evento nuevo, y el que decía que la
        persona autorizó sigue ahí, porque eso también ocurrió.
      </p>
    </div>
  );
}
