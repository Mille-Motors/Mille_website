import Image from "next/image";
import Link from "next/link";
import shield from "@/../public/brand/shield.png";
import { cn } from "@/lib/cn";

type Tone = "ink" | "cream";

const sizes = {
  sm: { shield: 26, word: "text-base tracking-[0.24em]" },
  md: { shield: 34, word: "text-xl tracking-[0.26em]" },
  lg: { shield: 42, word: "text-2xl tracking-[0.26em]" },
} as const;

export function Shield({
  size = 34,
  className,
  priority,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={shield}
      alt=""
      width={size}
      height={Math.round((size * shield.height) / shield.width)}
      priority={priority}
      className={cn("h-auto w-auto", className)}
      style={{ width: size }}
    />
  );
}

/** Exported so brand pieces that need the wordmark alone — no shield —
 * can reuse the exact same tone-driven styling instead of recreating it. */
export function Wordmark({
  tone = "ink",
  className,
  size = "md",
}: {
  tone?: Tone;
  className?: string;
  size?: keyof typeof sizes;
}) {
  return (
    <span
      className={cn(
        "font-display leading-none uppercase",
        sizes[size].word,
        tone === "cream" ? "text-cream" : "text-ink",
        className,
      )}
    >
      MILLE
    </span>
  );
}

export function Logo({
  tone = "ink",
  size = "md",
  href = "/",
  className,
  priority,
}: {
  tone?: Tone;
  size?: keyof typeof sizes;
  href?: string | null;
  className?: string;
  priority?: boolean;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Shield size={sizes[size].shield} priority={priority} />
      <Wordmark tone={tone} size={size} />
    </span>
  );

  if (href === null) return content;

  return (
    <Link href={href} aria-label="MILLE, ir al inicio" className="inline-flex">
      {content}
    </Link>
  );
}
