import type { VehicleStatus } from "@/types/vehicle";

interface StatusMeta {
  label: string;
  /** Tailwind classes for the dot used across cards, tables and detail. */
  dot: string;
  pill: string;
}

export const statusMeta: Record<VehicleStatus, StatusMeta> = {
  available: {
    label: "Disponible",
    dot: "bg-status-available",
    pill: "border-status-available/30 bg-status-available/10 text-status-available",
  },
  reserved: {
    label: "Reservado",
    dot: "bg-status-reserved",
    pill: "border-status-reserved/30 bg-status-reserved/10 text-status-reserved",
  },
  sold: {
    label: "Vendido",
    dot: "bg-status-sold",
    pill: "border-status-sold/30 bg-status-sold/10 text-status-sold",
  },
  draft: {
    label: "Borrador",
    dot: "bg-stone-strong",
    pill: "border-stone-strong/40 bg-sand text-ink-muted",
  },
};

export function statusLabel(status: VehicleStatus): string {
  return statusMeta[status].label;
}
