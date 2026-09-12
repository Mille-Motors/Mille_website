import type { AvailabilityStatus, PublicationStatus } from "@/types/vehicle";

interface StatusMeta {
  label: string;
  /** Clases Tailwind del punto que se repite en cards, tablas y detalle. */
  dot: string;
  pill: string;
}

/** Disponibilidad: lo único de estos dos ejes que ve el público. */
export const statusMeta: Record<AvailabilityStatus, StatusMeta> = {
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
};

export function statusLabel(status: AvailabilityStatus): string {
  return statusMeta[status].label;
}

/** Publicación: solo se muestra dentro del admin. */
export const publicationMeta: Record<PublicationStatus, StatusMeta> = {
  published: {
    label: "Publicado",
    dot: "bg-status-available",
    pill: "border-status-available/30 bg-status-available/10 text-status-available",
  },
  draft: {
    label: "Borrador",
    dot: "bg-stone-strong",
    pill: "border-stone-strong/40 bg-sand text-ink-muted",
  },
  archived: {
    label: "Archivado",
    dot: "bg-ink-muted",
    pill: "border-ink-muted/30 bg-ink/5 text-ink-muted",
  },
};

export function publicationLabel(status: PublicationStatus): string {
  return publicationMeta[status].label;
}
