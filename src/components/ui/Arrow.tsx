import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Círculo con flecha: la señal de "esto abre algo" en tarjetas enteras que
 * son un enlace. Va dentro de un elemento con `group`: la flecha avanza y el
 * círculo se rellena cuando el puntero entra en la tarjeta.
 */
export function RoundArrow({
  tone = "light",
  className,
}: {
  /** `light`: sobre crema. `dark`: sobre oscuro o sobre una fotografía. */
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full border transition-colors duration-300 sm:size-12",
        tone === "light"
          ? "border-ink/25 text-ink group-hover:border-ink group-hover:bg-ink group-hover:text-cream"
          : "border-cream/40 text-cream group-hover:border-cream group-hover:bg-cream group-hover:text-dark",
        className,
      )}
    >
      <ArrowRight
        strokeWidth={1.3}
        className="arrow-slide-icon size-5"
      />
    </span>
  );
}

/**
 * Enlace de texto con subrayado y flecha, el segundo nivel de acción del
 * sitio: más tranquilo que un botón, más claro que una palabra suelta.
 */
export function TextLink({
  href,
  children,
  className,
  external,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className" | "children">) {
  const classes = cn(
    "group inline-flex min-h-12 items-center gap-5 border-b border-current text-[1.125rem] leading-6",
    className,
  );
  const content = (
    <>
      {children}
      <ArrowRight
        aria-hidden
        strokeWidth={1.3}
        className="arrow-slide-icon size-5 shrink-0"
      />
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={classes}
        {...rest}
      >
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...rest}>
      {content}
    </Link>
  );
}
