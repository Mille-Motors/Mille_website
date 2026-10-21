import { cn } from "@/lib/cn";
import { statusMeta } from "@/lib/vehicle-status";
import type { AvailabilityStatus } from "@/types/vehicle";

/**
 * `onBurgundy` reestiliza los mismos tres estados para el hero vinotinto del
 * detalle, donde el tratamiento verde por defecto o desaparece o se lee como
 * un cuarto color fuerte compitiendo con la paleta. Disponible pasa a ser un
 * filete discreto en vez de una insignia rellena — es el estado normal, no un
 * logro — mientras reservado y vendido siguen legibles sin meter nada fuera
 * de crema y vinotinto.
 */
const onBurgundy: Record<AvailabilityStatus, string> = {
  available: "border-cream/30 text-cream/75",
  reserved: "border-cream/40 bg-cream text-burgundy",
  sold: "border-cream/30 bg-cream/15 text-cream/80",
};

const onBurgundyDot: Record<AvailabilityStatus, string> = {
  available: "bg-cream/60",
  reserved: "bg-burgundy",
  sold: "bg-cream/60",
};

/**
 * `sm` es la del admin: la misma insignia, del tamaño de una celda de tabla.
 * El sitio público usa la `md`, que es la de siempre.
 */
const sizes = {
  md: "gap-2 px-3.5 py-1.5 text-sm",
  sm: "gap-1.5 px-2.5 py-1 text-[0.8125rem] font-medium",
} as const;

export function StatusPill({
  status,
  tone = "default",
  size = "md",
  className,
}: {
  status: AvailabilityStatus;
  tone?: "default" | "onBurgundy";
  size?: keyof typeof sizes;
  className?: string;
}) {
  const meta = statusMeta[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border leading-none",
        sizes[size],
        tone === "onBurgundy" ? onBurgundy[status] : meta.pill,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          tone === "onBurgundy" ? onBurgundyDot[status] : meta.dot,
        )}
      />
      {meta.label}
    </span>
  );
}
