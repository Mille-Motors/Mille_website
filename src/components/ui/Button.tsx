import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Botones del sitio: esquinas de 4 px, texto en minúscula legible y, cuando
 * llevan flecha, la flecha al extremo. Responden a la mano: se hunden al
 * pulsar y la flecha avanza al pasar el puntero.
 *
 * `cream` es el botón de los campos vinotinto y oscuros: relleno crema, texto
 * vinotinto, que se invierte al pasar el puntero.
 */
type Variant =
  | "primary"
  | "outline"
  | "ghost"
  | "onDark"
  | "cream"
  | "whatsapp";
type Size = "sm" | "md" | "lg";

const base =
  "group press inline-flex items-center justify-center gap-3 rounded-md whitespace-nowrap text-base leading-6 font-medium disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-burgundy text-cream hover:bg-burgundy-dark",
  outline:
    "border border-burgundy/40 text-burgundy bg-transparent hover:border-burgundy hover:bg-burgundy/5",
  ghost: "border border-ink/25 text-ink bg-transparent hover:border-ink/60",
  onDark:
    "border border-cream/45 text-cream bg-dark/30 hover:bg-cream hover:text-ink hover:border-cream",
  cream:
    "border border-cream bg-cream text-burgundy hover:bg-transparent hover:text-cream",
  whatsapp: "bg-burgundy text-cream hover:bg-burgundy-dark",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-[0.9375rem]",
  md: "h-12 px-6",
  lg: "h-14 px-6 sm:px-7",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

type ButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">;

/** La flecha de un botón: se mueve sola cuando el botón recibe el puntero. */
export function ButtonArrow({ className }: { className?: string }) {
  return (
    <ArrowRight
      aria-hidden
      strokeWidth={1.4}
      className={cn("arrow-slide-icon size-5 shrink-0", className)}
    />
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

type ButtonLinkProps = CommonProps &
  Omit<React.ComponentProps<typeof Link>, "children" | "className">;

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </Link>
  );
}

type ExternalButtonLinkProps = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className">;

export function ExternalButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ExternalButtonLinkProps) {
  return (
    <a
      className={cn(base, variants[variant], sizes[size], className)}
      target="_blank"
      rel="noreferrer noopener"
      {...rest}
    >
      {children}
    </a>
  );
}

/**
 * Same shape as `ExternalButtonLink`, for a WhatsApp CTA that may not have a
 * real line yet. With a href it behaves identically; with `null` (no number
 * provisioned) it keeps the CTA's place in the layout but renders inert,
 * with a consistent "coming soon" label instead of whatever the caller
 * would normally say — never a link that looks live but opens nothing real.
 */
export function WhatsappButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: Omit<ExternalButtonLinkProps, "href"> & { href: string | null }) {
  if (!href) {
    return (
      <span
        aria-disabled="true"
        className={cn(
          base,
          variants[variant],
          sizes[size],
          "pointer-events-none cursor-not-allowed opacity-50",
          className,
        )}
      >
        WhatsApp próximamente
      </span>
    );
  }
  return (
    <ExternalButtonLink href={href} variant={variant} size={size} className={className} {...rest}>
      {children}
    </ExternalButtonLink>
  );
}
