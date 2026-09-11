import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  actions,
  footer,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 py-20 text-center sm:py-24",
        className,
      )}
    >
      {icon ? <div className="mb-7 text-burgundy">{icon}</div> : null}
      <h2 className="max-w-xl font-display text-[clamp(1.5rem,3.2vw,2.125rem)] leading-[1.15] text-ink uppercase">
        {title}
      </h2>
      {description ? (
        <p className="mt-5 max-w-md font-serif text-[1.0625rem] leading-relaxed text-ink-soft">
          {description}
        </p>
      ) : null}
      {actions ? (
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          {actions}
        </div>
      ) : null}
      {footer ? <div className="mt-14 w-full">{footer}</div> : null}
    </div>
  );
}
