import { cn } from "@/lib/cn";

/**
 * Section title with the short burgundy rule that follows it in the comps.
 * `action` sits opposite on desktop and drops below on mobile.
 */
export function SectionHeading({
  title,
  action,
  className,
  as: Tag = "h2",
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3",
        className,
      )}
    >
      <div className="flex items-center gap-5">
        <Tag className="font-display text-[clamp(1.75rem,3.4vw,2.5rem)] leading-[1.1] text-ink">
          {title}
        </Tag>
        <span aria-hidden className="hidden h-px w-14 bg-burgundy/60 sm:block" />
      </div>
      {action}
    </div>
  );
}
