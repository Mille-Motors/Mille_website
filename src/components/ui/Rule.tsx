import { cn } from "@/lib/cn";

/** Short burgundy rule used as an editorial separator under headings. */
export function Rule({
  className,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      aria-hidden
      className={cn("block h-px w-16 bg-burgundy/60", className)}
      {...rest}
    />
  );
}
