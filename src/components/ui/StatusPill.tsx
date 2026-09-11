import { cn } from "@/lib/cn";
import { statusMeta } from "@/lib/vehicle-status";
import type { VehicleStatus } from "@/types/vehicle";

export function StatusPill({
  status,
  className,
}: {
  status: VehicleStatus;
  className?: string;
}) {
  const meta = statusMeta[status];
  return (
    <span
      className={cn(
        "label-caps inline-flex items-center gap-2 rounded-xs border px-2.5 py-1.5 text-[10px]",
        meta.pill,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
