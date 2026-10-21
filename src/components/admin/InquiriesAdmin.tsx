"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bike, Car, Inbox, SearchX } from "lucide-react";
import { ActionMenu, type MenuEntry } from "@/components/admin/ActionMenu";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import {
  ActiveFilters,
  AdminField,
  AdminSelect,
  Chip,
  ChipRow,
  EmptyPanel,
  FilterButton,
  FilterPanel,
  Panel,
  Pager,
  Pill,
  SearchBox,
  Spinner,
  buttonClass,
  buttonPrimaryClass,
} from "@/components/admin/kit";
import { ButtonLink } from "@/components/ui/Button";
import { adminJson, adminRequest, type AdminResult } from "@/lib/admin-client";
import { adminInquiriesHref } from "@/lib/admin-urls";
import { cn } from "@/lib/cn";
import { formatDateTimeShort } from "@/lib/format";
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

/**
 * La bandeja de Consultas: lo que la gente escribe desde Contacto y desde las
 * fichas de vehículo.
 *
 * Cada consulta es una fila con una sola pregunta: «¿ya la atendí?». Por eso
 * tiene UNA acción visible —la que sigue en el flujo: nueva → contactada →
 * cerrada— y todo lo demás, que se usa de vez en cuando, en el menú. Antes
 * eran siete botones por fila, y atender una consulta era buscar cuál de los
 * siete.
 */

/** El estado, con la palabra que se lee en una fila. */
const statusLabel: Record<InquiryStatus, string> = {
  new: "Nueva",
  contacted: "Contactada",
  closed: "Cerrada",
  spam: "Spam",
};

const statusTone: Record<InquiryStatus, "success" | "info" | "neutral" | "warning"> = {
  new: "success",
  contacted: "info",
  closed: "neutral",
  spam: "warning",
};

const typeLabels: Record<InquiryType, string> = {
  general: "General",
  vehicle_info: "Información de vehículo",
  appointment: "Cita",
};

/** Lo siguiente que se hace con una consulta, según donde esté. */
const nextStep: Record<InquiryStatus, { label: string; to: InquiryStatus }> = {
  new: { label: "Marcar contactada", to: "contacted" },
  contacted: { label: "Cerrar", to: "closed" },
  closed: { label: "Reabrir", to: "new" },
  spam: { label: "No es spam", to: "new" },
};

/** Cómo se llama mover una consulta a cada estado, dentro del menú. */
const moveLabel: Record<InquiryStatus, string> = {
  new: "Marcar como nueva",
  contacted: "Marcar como contactada",
  closed: "Cerrar",
  spam: "Marcar como spam",
};

type Channel = "email" | "whatsapp" | "other";

type Feedback = { tone: "error" | "info"; text: string };

/**
 * Las acciones de una consulta. Cada una llama a su endpoint y después
 * repinta desde la base: lo que se ve es lo que quedó guardado. Si algo
 * falla, se dice en la fila y el estado no se mueve.
 */
function useInquiryActions(inquiry: Inquiry) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function run(
    key: string,
    call: () => Promise<AdminResult<unknown>>,
  ): Promise<boolean> {
    if (pending) return false;
    setPending(key);
    setFeedback(null);
    const result = await call();
    setPending(null);
    if (!result.ok) {
      setFeedback({ tone: "error", text: result.message });
      return false;
    }
    router.refresh();
    return true;
  }

  return {
    pending,
    feedback,
    setStatus: (status: InquiryStatus) =>
      run(`status-${status}`, () =>
        adminJson(`/api/admin/inquiries/${inquiry.id}`, "PATCH", { status }),
      ),
    remove: (reason?: "spam") =>
      run("delete", () =>
        adminRequest(
          `/api/admin/inquiries/${inquiry.id}${reason ? `?reason=${reason}` : ""}`,
          { method: "DELETE" },
        ),
      ),
    /**
     * Registra una revocatoria. Escribe un evento NUEVO, no corrige el viejo:
     * la tabla de consentimientos es append-only y la autorización anterior
     * también ocurrió.
     */
    revoke: (channel: Channel) =>
      run("revoke", () =>
        adminJson("/api/admin/consent-events/revocations", "POST", {
          inquiryId: inquiry.id,
          channel,
        }),
      ),
  };
}

type Actions = ReturnType<typeof useInquiryActions>;

function menuItems(
  inquiry: Inquiry,
  view: InquiryView,
  actions: Actions,
): MenuEntry[] {
  const primary = nextStep[inquiry.status].to;
  const items: MenuEntry[] = [];

  // Los demás estados a los que se puede ir. Repetir el actual no hace nada, y
  // el siguiente del flujo ya es el botón.
  for (const status of ["new", "contacted", "closed", "spam"] as const) {
    if (status === inquiry.status || status === primary) continue;
    items.push({
      label: moveLabel[status],
      onSelect: () => void actions.setStatus(status),
    });
  }

  if (view === "activas") {
    items.push({
      label: "Spam y eliminar",
      danger: true,
      confirm: {
        title: "¿Marcar como spam y eliminarla?",
        description: "Se elimina definitivamente. No se puede deshacer.",
        confirmLabel: "Sí, eliminar",
      },
      onSelect: () => void actions.remove("spam"),
    });
  }

  // No en la bandeja de spam: un bot no revoca una autorización.
  if (view !== "spam") {
    items.push(
      { kind: "separator" },
      { kind: "label", text: "Revocó su autorización de datos, por…" },
      ...(
        [
          ["email", "Correo"],
          ["whatsapp", "WhatsApp"],
          ["other", "Otro canal"],
        ] as const
      ).map(
        ([channel, label]): MenuEntry => ({
          label,
          confirm: {
            title: `¿Registrar que ${inquiry.name} revocó su autorización?`,
            description:
              "Queda como un evento permanente en Privacidad: no se puede editar ni borrar.",
            confirmLabel: "Registrar",
          },
          onSelect: () => void actions.revoke(channel),
        }),
      ),
    );
  }

  if (allowsDeletion(view)) {
    items.push(
      { kind: "separator" },
      {
        label: "Eliminar consulta",
        danger: true,
        confirm: {
          title: "¿Eliminar esta consulta?",
          description: "Se elimina definitivamente. No se puede deshacer.",
          confirmLabel: "Sí, eliminar",
        },
        onSelect: () => void actions.remove(),
      },
    );
  }

  return items;
}

const LONG_MESSAGE = 150;

function InquiryRow({ inquiry, view }: { inquiry: Inquiry; view: InquiryView }) {
  const actions = useInquiryActions(inquiry);
  const [expanded, setExpanded] = useState(false);
  const busy = actions.pending !== null;
  const step = nextStep[inquiry.status];
  const isNew = inquiry.status === "new";
  const long = (inquiry.message?.length ?? 0) > LONG_MESSAGE;

  return (
    <li
      aria-busy={busy}
      className={cn(
        "relative px-5 py-4 transition-colors",
        isNew && "bg-burgundy/2.5",
      )}
    >
      {/* El punto de «sin leer»: la fila sola ya lo dice con la insignia, el
          punto lo hace visible al recorrer la lista de un vistazo. */}
      {isNew ? (
        <span
          aria-hidden
          className="absolute top-6.5 left-2 size-2 rounded-full bg-burgundy"
        />
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-80">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <p className="text-base font-semibold text-ink">{inquiry.name}</p>
            <Pill tone={statusTone[inquiry.status]}>{statusLabel[inquiry.status]}</Pill>
          </div>

          <p className="mt-0.5 flex flex-wrap gap-x-2 text-[0.9375rem] text-ink-muted">
            {inquiry.phone ? (
              <a
                href={`tel:${inquiry.phone.replace(/\s/g, "")}`}
                className="transition-colors hover:text-burgundy"
              >
                {inquiry.phone}
              </a>
            ) : null}
            {inquiry.phone && inquiry.email ? <span aria-hidden>·</span> : null}
            {inquiry.email ? (
              <a
                href={`mailto:${inquiry.email}`}
                className="transition-colors hover:text-burgundy"
              >
                {inquiry.email}
              </a>
            ) : null}
          </p>

          {inquiry.vehicleLabel ? (
            <p className="mt-2 flex items-center gap-2 text-[0.9375rem] text-ink-soft">
              {inquiry.vehicleType === "moto" ? (
                <Bike aria-hidden className="size-4 shrink-0 text-ink-muted" strokeWidth={1.4} />
              ) : (
                <Car aria-hidden className="size-4 shrink-0 text-ink-muted" strokeWidth={1.4} />
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
            <div className="mt-1.5 max-w-2xl">
              <p
                className={cn(
                  "text-[0.9375rem] leading-relaxed whitespace-pre-line text-ink-soft",
                  !expanded && "line-clamp-2",
                )}
              >
                {inquiry.message}
              </p>
              {long ? (
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setExpanded((value) => !value)}
                  className="mt-0.5 rounded-md text-sm font-medium text-burgundy underline-offset-4 hover:underline"
                >
                  {expanded ? "Ver menos" : "Ver más"}
                </button>
              ) : null}
            </div>
          ) : null}

          {actions.feedback ? (
            <p
              role={actions.feedback.tone === "error" ? "alert" : "status"}
              className={cn(
                "mt-2 text-sm leading-snug",
                actions.feedback.tone === "error" ? "text-burgundy" : "text-ink-soft",
              )}
            >
              {actions.feedback.text}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-3 max-sm:w-full max-sm:items-stretch">
          <p className="text-sm text-ink-muted tabular">
            {typeLabels[inquiry.type]} · {formatDateTimeShort(inquiry.createdAt)}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void actions.setStatus(step.to)}
              aria-label={`${step.label}: ${inquiry.name}`}
              className={cn(
                buttonClass,
                // Lo que hay que hacer con una consulta nueva es lo único que
                // se pinta como principal; reabrir o devolver del spam, no.
                isNew || inquiry.status === "contacted" ? buttonPrimaryClass : "",
                "min-w-24 px-4 max-sm:flex-1",
              )}
            >
              {actions.pending === `status-${step.to}` ? <Spinner /> : null}
              {step.label}
            </button>
            <ActionMenu
              label={`Más acciones para ${inquiry.name}`}
              disabled={busy}
              items={menuItems(inquiry, view, actions)}
              triggerClassName={cn(buttonClass, "w-9 shrink-0 px-0")}
            />
          </div>
        </div>
      </div>
    </li>
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
  const [search, setSearch] = useState(query.q ?? "");
  const [panelOpen, setPanelOpen] = useState(
    query.type !== undefined ||
      query.vehicleType !== undefined ||
      query.vehicleId !== undefined,
  );

  // Si la URL cambia por otra vía —atrás, Limpiar filtros— el input la sigue.
  const [seenQ, setSeenQ] = useState(query.q);
  if (seenQ !== query.q) {
    setSeenQ(query.q);
    setSearch(query.q ?? "");
  }

  /** Cambiar bandeja o filtro vuelve a la página 1. */
  function go(patch: Partial<AdminInquiryQuery>) {
    startTransition(() =>
      router.push(adminInquiriesHref({ ...query, ...patch, page: 1 })),
    );
  }

  const viewCount = (view: InquiryView) =>
    inquiryViewStatuses[view].reduce((sum, status) => sum + counts[status], 0);

  // Lo que hay dentro del panel, para la insignia del botón.
  const specificVehicle =
    query.vehicleId && query.vehicleId !== "none" ? query.vehicleId : undefined;
  const panelCount = [
    query.type,
    // «Sin vehículo asociado» vive en el mismo selector que Carros y Motos.
    query.vehicleType ?? (query.vehicleId === "none" ? "none" : undefined),
    specificVehicle,
  ].filter((value) => value !== undefined).length;

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
      title: "No hay consultas pendientes",
      description: "Todo lo que ha llegado está cerrado o marcado como spam.",
    },
    cerradas: {
      title: "No hay consultas cerradas",
      description: "Aquí quedan las que ya atendiste, por si hace falta consultarlas.",
    },
    spam: {
      title: "No hay consultas marcadas como spam",
      description: "Lo que marques como spam aparecerá aquí.",
    },
  };

  return (
    <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader
        title="Consultas"
        subtitle="Lo que la gente escribe desde Contacto y desde las fichas de vehículo"
      />

      <div className={cn("mb-4", navigating && "opacity-60")} aria-busy={navigating}>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox
            value={search}
            onChange={setSearch}
            onSubmit={() => go({ q: search.trim() || undefined })}
            label="Buscar por nombre, correo, teléfono o vehículo"
            placeholder="Buscar nombre, correo o teléfono…"
          />

          <FilterButton
            open={panelOpen}
            count={panelCount}
            controls="inquiry-filter-panel"
            onClick={() => setPanelOpen((open) => !open)}
          />

          {/* Las bandejas, y dentro de Activas, nuevas o contactadas. */}
          <ChipRow label="Bandeja" className="order-last xl:order-0 xl:m-0 xl:w-auto xl:overflow-visible xl:p-0">
            {INQUIRY_VIEWS.map((view) => (
              <Chip
                key={view}
                active={query.view === view && !query.status}
                count={viewCount(view)}
                onClick={() => go({ view, status: undefined })}
              >
                {inquiryViewLabels[view]}
              </Chip>
            ))}
            {subStatuses.length > 1 ? (
              <>
                <span aria-hidden className="mx-1 h-5 w-px bg-stone-strong" />
                {subStatuses.map((status) => (
                  <Chip
                    key={status}
                    active={query.status === status}
                    count={counts[status]}
                    onClick={() =>
                      go({ status: query.status === status ? undefined : status })
                    }
                  >
                    {statusLabel[status]}s
                  </Chip>
                ))}
              </>
            ) : null}
          </ChipRow>
        </div>

        {panelOpen ? (
          <FilterPanel id="inquiry-filter-panel" className="lg:grid-cols-3">
            <AdminField label="Tipo de consulta">
              <AdminSelect
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
              </AdminSelect>
            </AdminField>

            <AdminField label="Tipo de vehículo">
              <AdminSelect
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
              </AdminSelect>
            </AdminField>

            <AdminField label="Vehículo">
              <AdminSelect
                value={specificVehicle ?? ""}
                onChange={(value) => go({ vehicleId: value || undefined })}
              >
                <option value="">Todos</option>
                {vehicles.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
          </FilterPanel>
        ) : null}

        {activeCount > 0 ? (
          <ActiveFilters
            summary={`${total} ${total === 1 ? "consulta" : "consultas"} con estos filtros en ${inquiryViewLabels[query.view].toLowerCase()}`}
            onClear={() => {
              setSearch("");
              startTransition(() =>
                router.push(adminInquiriesHref({ view: query.view })),
              );
            }}
          />
        ) : null}
      </div>

      <Panel className="overflow-hidden">
        {inquiries.length === 0 ? (
          <EmptyPanel
            icon={
              activeCount > 0 ? (
                <SearchX aria-hidden className="size-5" strokeWidth={1.5} />
              ) : (
                <Inbox aria-hidden className="size-5" strokeWidth={1.5} />
              )
            }
            title={
              activeCount > 0
                ? "Ninguna consulta coincide con estos filtros"
                : emptyCopy[query.view].title
            }
            description={
              activeCount > 0
                ? "Prueba con otra búsqueda o quita algún filtro."
                : emptyCopy[query.view].description
            }
            action={
              activeCount > 0 ? (
                <ButtonLink
                  href={adminInquiriesHref({ view: query.view })}
                  variant="outline"
                  size="sm"
                >
                  Limpiar filtros
                </ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-stone">
            {inquiries.map((inquiry) => (
              <InquiryRow key={inquiry.id} inquiry={inquiry} view={query.view} />
            ))}
          </ul>
        )}
      </Panel>

      <Pager
        page={query.page}
        pages={pages}
        total={total}
        shown={inquiries.length}
        limit={query.limit}
        noun={["consulta", "consultas"]}
        pending={navigating}
        onPage={(page) =>
          startTransition(() => router.push(adminInquiriesHref({ ...query, page })))
        }
      />
    </div>
  );
}
