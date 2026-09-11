import Link from "next/link";
import { MapPin } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { mainNav, site } from "@/data/site";
import { cn } from "@/lib/cn";

export function Navbar({
  tone = "cream",
  cta = { label: "Ver inventario", href: "/vehiculos" },
}: {
  tone?: "cream" | "dark";
  cta?: { label: string; href: string };
}) {
  const dark = tone === "dark";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b backdrop-blur-[6px]",
        dark
          ? "border-cream/12 bg-black/90"
          : "border-stone bg-cream/92",
      )}
    >
      <Container width="wide">
        <div className="flex h-18 items-center justify-between gap-6">
          <Logo tone={dark ? "cream" : "ink"} priority />

          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {mainNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "font-serif text-[0.9375rem] transition-colors",
                      dark
                        ? "text-cream/80 hover:text-cream"
                        : "text-ink-soft hover:text-burgundy",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-5">
            <span
              className={cn(
                "hidden items-center gap-1.5 font-serif text-sm xl:inline-flex",
                dark ? "text-cream/65" : "text-ink-muted",
              )}
            >
              <MapPin aria-hidden className="size-3.5" strokeWidth={1.5} />
              {site.cityShort}
            </span>

            <ButtonLink
              href={cta.href}
              variant={dark ? "onDark" : "primary"}
              size="sm"
              className="hidden sm:inline-flex"
            >
              {cta.label}
            </ButtonLink>

            <MobileMenu tone={tone} cta={cta} />
          </div>
        </div>
      </Container>
    </header>
  );
}
