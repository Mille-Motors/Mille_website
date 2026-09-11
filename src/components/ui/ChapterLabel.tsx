import { cn } from "@/lib/cn";

/**
 * Editorial chapter marker: "01 — Quiénes somos".
 * Used to number the sections of the MILLE story.
 */
export function ChapterLabel({
  number,
  title,
  tone = "ink",
  className,
}: {
  number: string;
  title: string;
  tone?: "ink" | "cream";
  className?: string;
}) {
  const dark = tone === "cream";
  return (
    <p className={cn("flex items-center gap-4", className)}>
      <span
        className={cn(
          "font-display text-xl leading-none tabular",
          dark ? "text-cream/70" : "text-burgundy",
        )}
      >
        {number}
      </span>
      <span
        aria-hidden
        className={cn("h-px w-8", dark ? "bg-cream/25" : "bg-stone-strong")}
      />
      <span
        className={cn("label-caps", dark ? "text-cream/60" : "text-ink-muted")}
      >
        {title}
      </span>
    </p>
  );
}
