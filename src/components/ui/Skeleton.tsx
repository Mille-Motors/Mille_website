import { cn } from "@/lib/cn";

/** Quiet placeholder block. Cream-toned so loading never flashes grey. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-xs bg-sand", className)}
      aria-hidden
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Small burgundy progress hint. Used instead of a large spinner. */
export function LoadingHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="label-caps flex items-center justify-center gap-3 text-ink-muted">
      <span
        aria-hidden
        className="size-3 animate-spin rounded-full border border-burgundy/30 border-t-burgundy"
      />
      {children}
    </p>
  );
}
