import { cn } from "@/lib/cn";
import { publicationMeta } from "@/lib/vehicle-status";
import type { PublicationStatus } from "@/types/vehicle";

/**
 * El gemelo interno de StatusPill. Publicación y disponibilidad son dos ejes
 * distintos, así que se muestran como dos insignias y no como una sola que
 * mezcle "vendido" con "borrador". Solo aparece dentro del admin.
 */
export function PublicationPill({
  status,
  className,
}: {
  status: PublicationStatus;
  className?: string;
}) {
  const meta = publicationMeta[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.8125rem] leading-none font-medium",
        meta.pill,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
