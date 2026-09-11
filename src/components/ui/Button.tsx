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
