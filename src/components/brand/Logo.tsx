import Image from "next/image";
import Link from "next/link";
import shield from "@/../public/brand/shield.png";
import { cn } from "@/lib/cn";

type Tone = "ink" | "cream" | "wine";

/**
 * `header` es el tamaño de la barra superior: crece con la pantalla porque el
 * logotipo es lo único que la barra dice de sí misma. El resto son tamaños
 * fijos para pie, panel de administración y piezas de marca.
 */
const sizes = {
  sm: { shield: 26, word: "text-base tracking-[0.24em]" },
  md: { shield: 34, word: "text-xl tracking-[0.22em]" },
  lg: { shield: 42, word: "text-2xl tracking-[0.22em]" },
  header: {
    shield: 40,
    word: "text-[1.625rem] tracking-[0.2em] sm:text-[2rem] lg:text-[2.375rem]",
  },
} as const;

const tones: Record<Tone, string> = {
  ink: "text-ink",
  cream: "text-cream",
  wine: "text-burgundy",
};

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
        "font-wordmark leading-none uppercase",
        sizes[size].word,
        tones[tone],
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
    <span className={cn("inline-flex items-center gap-2.5 sm:gap-3.5", className)}>
      <span
        className={cn(
          // El escudo del encabezado se reduce en teléfono para dejar sitio
          // al texto sin cambiar de archivo.
          size === "header" && "[&_img]:max-sm:w-7!",
        )}
      >
        <Shield size={sizes[size].shield} priority={priority} />
      </span>
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
