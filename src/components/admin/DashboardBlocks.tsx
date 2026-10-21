import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck,
  Check,
  ChevronRight,
  FileText,
  Inbox,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Panel, Pill, SectionTitle } from "@/components/admin/kit";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";
import type { WhatsappClickStats } from "@/server/whatsapp/service";
import type { Inquiry, InquiryStatus, InventoryStats } from "@/types/vehicle";

/**
 * Los bloques del Panel.
 *
 * El Panel responde dos preguntas y solo dos: «¿qué tengo que atender hoy?»
 * y «¿cómo va el negocio?». La lista de vehículos ya vive en Vehículos;
 * repetirla aquí era lo que hacía que las dos pantallas parecieran la misma.
 *
 * Todo son componentes de servidor: leen datos que ya llegaron y no guardan
 * estado, así que pintan lo que la base tiene en este momento.
 */

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

// ---------------------------------------------------------------------------
// Para atender
// ---------------------------------------------------------------------------

type Tone = "urgent" | "attention" | "normal";

export interface Attention {
  key: string;
  tone: Tone;
  icon: React.ReactNode;
  title: string;
  hint: string;
  href: string;
}

const iconProps = { "aria-hidden": true, className: "size-5", strokeWidth: 1.5 } as const;

/**
 * Lo que está esperando a una persona, de lo que no puede esperar a lo que sí.
 * Solo aparece lo que tiene algo pendiente: una lista de cuatro renglones que
 * dicen «0» enseña al ojo a saltársela.
 */
export function attentionItems({
  stats,
  privacy,
  legalGaps,
}: {
  stats: InventoryStats;
  privacy: { open: number; overdue: number };
  legalGaps: number;
}): Attention[] {
  const items: Attention[] = [];

  if (privacy.overdue > 0) {
    items.push({
      key: "privacy-overdue",
      tone: "urgent",
      icon: <ShieldAlert {...iconProps} />,
      title: plural(
        privacy.overdue,
        "solicitud de privacidad vencida",
        "solicitudes de privacidad vencidas",
      ),
      hint: "La ley fija un plazo para responder. Estas son lo primero.",
      href: "/admin/privacidad",
    });
  } else if (privacy.open > 0) {
    items.push({
      key: "privacy-open",
      tone: "normal",
      icon: <ShieldCheck {...iconProps} />,
      title: plural(
        privacy.open,
        "solicitud de privacidad abierta",
        "solicitudes de privacidad abiertas",
      ),
      hint: "Dentro de plazo.",
      href: "/admin/privacidad",
    });
  }

  if (stats.newInquiries > 0) {
    items.push({
      key: "inquiries",
      tone: "attention",
      icon: <Inbox {...iconProps} />,
      title: plural(stats.newInquiries, "consulta nueva", "consultas nuevas"),
      hint: "Nadie las ha contestado todavía.",
      href: "/admin/solicitudes?status=new",
    });
  }

  if (legalGaps > 0) {
    items.push({
      key: "legal",
      tone: "attention",
      icon: <AlertTriangle {...iconProps} />,
      title: "Faltan datos legales por confirmar",
      hint: "La política de privacidad todavía muestra campos pendientes.",
      href: "/admin/configuracion",
    });
  }

  if (stats.reserved > 0) {
    items.push({
      key: "reserved",
      tone: "normal",
      icon: <CalendarCheck {...iconProps} />,
      title: plural(stats.reserved, "vehículo reservado", "vehículos reservados"),
      hint: "Cierra la venta o libera la reserva.",
      href: "/admin/vehiculos?availability=reserved",
    });
  }

  if (stats.draft > 0) {
    items.push({
      key: "drafts",
      tone: "normal",
      icon: <FileText {...iconProps} />,
      title: plural(stats.draft, "borrador sin publicar", "borradores sin publicar"),
      hint: "Complétalos y publícalos para que se vean en el sitio.",
      href: "/admin/vehiculos?publication=draft",
    });
  }

  return items;
}

const bubble: Record<Tone, string> = {
  urgent: "bg-status-sold/15 text-status-sold",
  attention: "bg-burgundy/10 text-burgundy",
  normal: "bg-sand text-ink-soft",
};

export function AttentionList({ items }: { items: Attention[] }) {
  return (
    <section>
      <SectionTitle title="Para atender" />

      {items.length === 0 ? (
        <Panel className="flex items-center gap-4 px-5 py-5">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-status-available/12 text-status-available">
            <Check aria-hidden className="size-5" strokeWidth={1.8} />
          </span>
          <div>
            <p className="text-base font-semibold text-ink">Todo al día</p>
            <p className="text-[0.9375rem] text-ink-muted">
              No hay consultas nuevas, plazos corriendo ni borradores pendientes.
            </p>
          </div>
        </Panel>
      ) : (
        <Panel className="divide-y divide-stone overflow-hidden">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-sand/45 focus-visible:outline-offset-[-2px]"
            >
              <span
                className={cn(
                  "inline-flex size-11 shrink-0 items-center justify-center rounded-full",
                  bubble[item.tone],
                )}
              >
                {item.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-base font-semibold",
                    item.tone === "urgent" ? "text-status-sold" : "text-ink",
                  )}
                >
                  {item.title}
                </span>
                <span className="block text-[0.9375rem] text-ink-muted">{item.hint}</span>
              </span>
              <ChevronRight
                aria-hidden
                strokeWidth={1.4}
                className="size-4 shrink-0 text-ink-muted transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          ))}
        </Panel>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Últimas consultas
// ---------------------------------------------------------------------------

const inquiryTone: Record<InquiryStatus, "success" | "info" | "neutral" | "warning"> = {
  new: "success",
  contacted: "info",
  closed: "neutral",
  spam: "warning",
};

const inquiryLabel: Record<InquiryStatus, string> = {
  new: "Nueva",
  contacted: "Contactada",
  closed: "Cerrada",
  spam: "Spam",
};

export function RecentInquiries({ inquiries }: { inquiries: Inquiry[] }) {
  return (
    <section>
      <SectionTitle
        title="Últimas consultas"
        action={
          <Link
            href="/admin/solicitudes"
            className="text-sm font-medium text-burgundy underline-offset-4 hover:underline"
          >
            Ver todas
          </Link>
        }
      />
      {inquiries.length === 0 ? (
        <Panel className="px-5 py-8 text-center text-[0.9375rem] text-ink-muted">
          No hay consultas activas. Cuando alguien escriba desde el sitio,
          aparecerá aquí.
        </Panel>
      ) : (
        <Panel className="divide-y divide-stone overflow-hidden">
          {inquiries.map((inquiry) => (
            <Link
              key={inquiry.id}
              href="/admin/solicitudes"
              className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-sand/45 focus-visible:outline-offset-[-2px]"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold text-ink">
                  {inquiry.name}
                </span>
                <span className="block truncate text-[0.9375rem] text-ink-muted">
                  {inquiry.vehicleLabel ??
                    (inquiry.type === "appointment"
                      ? "Quiere agendar una cita"
                      : "Consulta general")}
                </span>
              </span>
              <span className="hidden shrink-0 text-sm text-ink-muted sm:block">
                {formatRelative(inquiry.createdAt)}
              </span>
              <Pill tone={inquiryTone[inquiry.status]}>
                {inquiryLabel[inquiry.status]}
              </Pill>
            </Link>
          ))}
        </Panel>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Inventario
// ---------------------------------------------------------------------------

interface Segment {
  label: string;
  value: number;
  /** El color del segmento y del punto de la leyenda. */
  color: string;
  href: string;
}

function Bar({ title, segments }: { title: string; segments: Segment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink-muted">{title}</p>
      {/* La barra es una vista de las cifras de abajo, que sí las dicen. */}
      <div aria-hidden className="flex h-2 overflow-hidden rounded-full bg-sand">
        {total > 0
          ? segments.map((segment) =>
              segment.value > 0 ? (
                <span
                  key={segment.label}
                  className={segment.color}
                  style={{ width: `${(segment.value / total) * 100}%` }}
                />
              ) : null,
            )
          : null}
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-2">
        {segments.map((segment) => (
          <li key={segment.label}>
            <Link
              href={segment.href}
              className="block rounded-lg py-1 transition-colors hover:text-burgundy"
            >
              <span className="block text-[1.375rem] leading-none font-semibold text-ink tabular">
                {segment.value}
              </span>
              <span className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-muted">
                <span aria-hidden className={cn("size-2 rounded-full", segment.color)} />
                {segment.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InventoryOverview({ stats }: { stats: InventoryStats }) {
  return (
    <section>
      <SectionTitle
        title="Inventario"
        action={
          <Link
            href="/admin/vehiculos"
            className="text-sm font-medium text-burgundy underline-offset-4 hover:underline"
          >
            {plural(stats.total, "vehículo", "vehículos")}
          </Link>
        }
      />
      <Panel className="grid gap-6 px-5 py-5">
        <Bar
          title="En el sitio"
          segments={[
            {
              label: "Publicados",
              value: stats.published,
              color: "bg-status-available",
              href: "/admin/vehiculos?publication=published",
            },
            {
              label: "Borradores",
              value: stats.draft,
              color: "bg-draft-ink/50",
              href: "/admin/vehiculos?publication=draft",
            },
            {
              label: "Archivados",
              value: stats.archived,
              color: "bg-stone-strong",
              href: "/admin/vehiculos?publication=archived",
            },
          ]}
        />
        <Bar
          title="Disponibilidad"
          segments={[
            {
              label: "Disponibles",
              value: stats.available,
              color: "bg-status-available",
              href: "/admin/vehiculos?availability=available",
            },
            {
              label: "Reservados",
              value: stats.reserved,
              color: "bg-burgundy",
              href: "/admin/vehiculos?availability=reserved",
            },
            {
              label: "Vendidos",
              value: stats.sold,
              color: "bg-status-sold",
              href: "/admin/vehiculos?availability=sold",
            },
          ]}
        />
      </Panel>
    </section>
  );
}

// ---------------------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------------------

/**
 * Cuántas veces se tocó el botón de WhatsApp. Un toque no es una conversación:
 * es la intención de escribir, y es lo que el sitio puede saber desde afuera.
 * Las conversaciones de verdad viven en la app de WhatsApp Business.
 */
export function WhatsappInterest({ stats }: { stats: WhatsappClickStats }) {
  const figures = [
    { label: "7 días", value: stats.last7Days },
    { label: "30 días", value: stats.last30Days },
    { label: "Total", value: stats.total },
  ];

  return (
    <section>
      <SectionTitle title="Toques a WhatsApp" />
      <Panel className="px-5 py-5">
        <ul className="grid grid-cols-3 gap-2">
          {figures.map((item) => (
            <li key={item.label}>
              <span className="block text-[1.375rem] leading-none font-semibold text-ink tabular">
                {item.value}
              </span>
              <span className="mt-1.5 block text-sm text-ink-muted">{item.label}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 border-t border-stone pt-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-muted">
            <MessageCircle aria-hidden className="size-4" strokeWidth={1.5} />
            Los que más mueven · 30 días
          </p>
          {stats.topVehicles.length > 0 ? (
            <ol className="divide-y divide-stone">
              {stats.topVehicles.map((row) => (
                <li
                  key={row.slug}
                  className="flex items-center justify-between gap-4 py-2"
                >
                  <Link
                    href={`/vehiculos/${row.slug}`}
                    className="min-w-0 truncate text-[0.9375rem] text-ink transition-colors hover:text-burgundy"
                  >
                    {row.slug}
                  </Link>
                  <span className="text-base font-semibold text-burgundy tabular">
                    {row.clicks}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[0.9375rem] text-ink-muted">
              Todavía nadie ha escrito desde la ficha de un vehículo.
            </p>
          )}
        </div>
      </Panel>
    </section>
  );
}
