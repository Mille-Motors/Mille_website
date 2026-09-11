import { cn } from "@/lib/cn";
import { statusMeta } from "@/lib/vehicle-status";
import type { VehicleStatus } from "@/types/vehicle";

/**
 * `onBurgundy` restyles the same three statuses for the vinotinto detail
 * hero, where the default green/pill treatment either disappears or reads as
 * a fourth strong color competing with the palette. Available becomes a
 * quiet hairline instead of a filled badge — it is the default state, not an
 * achievement — while reserved and sold stay legible without introducing
 * anything outside cream/burgundy.
 */
const onBurgundy: Record<VehicleStatus, string> = {
  available: "border-cream/30 text-cream/75",
  reserved: "border-cream/40 bg-cream text-burgundy",
  sold: "border-cream/30 bg-cream/15 text-cream/80",
  // Never actually shown here — drafts aren't public — kept only so the
  // record stays total over VehicleStatus.
  draft: "border-cream/30 bg-cream/15 text-cream/80",
};

const onBurgundyDot: Record<VehicleStatus, string> = {
  available: "bg-cream/60",
  reserved: "bg-burgundy",
  sold: "bg-cream/60",
  draft: "bg-cream/60",
};

export function StatusPill({
  status,
  tone = "default",
  className,
}: {
  status: VehicleStatus;
  tone?: "default" | "onBurgundy";
  className?: string;
}) {
  const meta = statusMeta[status];
  return (
    <span
      className={cn(
        "label-caps inline-flex items-center gap-2 rounded-xs border px-2.5 py-1.5 text-[10px]",
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
