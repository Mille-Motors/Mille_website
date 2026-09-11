import { cn } from "@/lib/cn";

/** Short burgundy rule used as an editorial separator under headings. */
export function Rule({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block h-px w-16 bg-burgundy/60", className)} />;
}
