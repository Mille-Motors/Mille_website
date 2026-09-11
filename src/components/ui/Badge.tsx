import { cn } from "@/lib/cn";

export function Badge({
  children,
  className,
  tone = "dark",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "dark" | "burgundy" | "light";
}) {
  const tones = {
    dark: "bg-black/80 text-cream",
    burgundy: "bg-burgundy text-cream",
    light: "bg-cream/90 text-ink",
  } as const;

  return (
    <span
      className={cn(
        "label-caps inline-flex items-center px-2.5 py-1.5 text-[10px] backdrop-blur-[2px]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
