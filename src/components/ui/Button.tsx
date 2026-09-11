import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "ghost" | "onDark" | "whatsapp";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2.5 rounded-xs label-caps whitespace-nowrap transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-burgundy text-cream hover:bg-burgundy-dark",
  outline:
    "border border-burgundy/35 text-burgundy bg-transparent hover:border-burgundy hover:bg-burgundy/5",
  ghost: "border border-stone text-ink bg-transparent hover:border-ink/40",
  onDark:
    "border border-cream/30 text-cream bg-transparent hover:border-cream hover:bg-cream/10",
  whatsapp: "bg-burgundy text-cream hover:bg-burgundy-dark",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[10px]",
  md: "h-11 px-6",
  lg: "h-13 px-8",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

type ButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">;

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
