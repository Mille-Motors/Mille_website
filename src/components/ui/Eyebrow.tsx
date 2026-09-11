import { cn } from "@/lib/cn";

/** The small letterspaced line that sits above MILLE headings. */
export function Eyebrow({
  children,
  className,
  as: Tag = "p",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "p" | "span" | "div";
}) {
  return (
    <Tag className={cn("eyebrow text-ink-muted", className)}>{children}</Tag>
  );
}
