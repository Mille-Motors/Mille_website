"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { adminJson } from "@/lib/admin-client";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { INQUIRY_STATUSES } from "@/types/vehicle";
import type { Inquiry, InquiryStatus, InquiryType } from "@/types/vehicle";

const statusLabels: Record<InquiryStatus, string> = {
  new: "Nuevas",
  contacted: "Contactadas",
  closed: "Cerradas",
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

export function InquiriesAdmin({
  inquiries,
  counts,
  total,
  status,
}: {
  inquiries: Inquiry[];
  counts: Record<InquiryStatus, number>;
  total: number;
  status?: InquiryStatus;
}) {
  const router = useRouter();
  const [navigating, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  function filterBy(next?: InquiryStatus) {
    startTransition(() =>
      router.push(`/admin/solicitudes${next ? `?status=${next}` : ""}`),
    );
  }

  const chip = (active: boolean) =>
    cn(
      "label-caps inline-flex items-center gap-2 rounded-xs border px-3.5 py-2 text-[10px] transition-colors",
      active
        ? "border-burgundy bg-burgundy text-cream"
        : "border-stone text-ink-soft hover:border-stone-strong",
    );

  const allCount = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <AdminPageHeader
        title="Solicitudes"
        subtitle="Lo que llega desde Contacto y desde las fichas de vehículo"
      />

      <div
        className={cn("-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0", navigating && "opacity-60")}
      >
        <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          <button
            type="button"
            onClick={() => filterBy(undefined)}
            className={chip(!status)}
          >
            Todas <span className="opacity-60 tabular">{allCount}</span>
          </button>
          {INQUIRY_STATUSES.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => filterBy(status === key ? undefined : key)}
              className={chip(status === key)}
            >
              {statusLabels[key]}{" "}
              <span className="opacity-60 tabular">{counts[key]}</span>
            </button>
          ))}
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
              title="No hay solicitudes que mostrar."
              description="Aquí aparecerá lo que envíe la gente desde el sitio público."
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
                      {statusLabels[inquiry.status].replace(/s$/, "")}
                    </span>
                    <span className="font-serif text-xs text-ink-muted">
                      {formatDate(inquiry.createdAt)}
                    </span>
                  </div>
                </div>

                {inquiry.vehicleLabel ? (
                  <p className="mt-3 font-serif text-sm text-ink-soft">
                    Vehículo:{" "}
                    {inquiry.vehicleSlug ? (
                      <Link
                        href={`/vehiculos/${inquiry.vehicleSlug}`}
                        className="underline underline-offset-4 transition-colors hover:text-burgundy"
                      >
                        {inquiry.vehicleLabel}
                      </Link>
                    ) : (
                      inquiry.vehicleLabel
                    )}
                  </p>
                ) : null}

                {inquiry.message ? (
                  <p className="mt-3 max-w-2xl font-serif text-[0.9375rem] leading-relaxed whitespace-pre-line text-ink-soft">
                    {inquiry.message}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {INQUIRY_STATUSES.filter((key) => key !== inquiry.status).map(
                    (key) => (
                      <button
                        key={key}
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void setStatus(inquiry.id, key)}
                        className="label-caps rounded-xs border border-stone px-3 py-1.5 text-[10px] text-ink transition-colors hover:border-ink/40 disabled:opacity-40"
                      >
                        {statusLabels[key].replace(/s$/, "")}
                      </button>
                    ),
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {total > inquiries.length ? (
        <p className="mt-6 font-serif text-sm text-ink-muted tabular">
          Mostrando {inquiries.length} de {total}.
        </p>
      ) : null}
    </div>
  );
}
