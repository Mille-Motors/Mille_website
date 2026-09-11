import Link from "next/link";
import { MapPin } from "lucide-react";
import { InstagramIcon, WhatsappIcon } from "@/components/ui/BrandIcons";
import { Logo } from "@/components/brand/Logo";
import { Container } from "@/components/ui/Container";
import { site } from "@/data/site";
import { generalWhatsappUrl } from "@/lib/whatsapp";

const whatsappHref = generalWhatsappUrl();

const year = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="border-t border-stone bg-cream">
      <Container width="wide">
        <div className="flex flex-col gap-10 py-12 lg:flex-row lg:items-start lg:justify-between lg:py-14">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
            <Logo href={null} />
            <p className="eyebrow max-w-[19rem] leading-[1.8] text-ink-muted">
              {site.tagline}
            </p>
          </div>

          <nav aria-label="Pie de página">
            <ul className="flex flex-wrap items-center gap-x-7 gap-y-3">
              <li>
                <Link
                  href="/vehiculos"
                  className="font-serif text-[0.9375rem] text-ink-soft transition-colors hover:text-burgundy"
                >
                  Vehículos
                </Link>
              </li>
              <li>
                <Link
                  href="/contacto"
                  className="font-serif text-[0.9375rem] text-ink-soft transition-colors hover:text-burgundy"
                >
                  Contacto
                </Link>
              </li>
              {site.instagram ? (
                <li>
                  <a
                    href={site.instagram.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2 font-serif text-[0.9375rem] text-ink-soft transition-colors hover:text-burgundy"
                  >
                    <InstagramIcon className="size-4" />
                    Instagram
                  </a>
                </li>
              ) : null}
              {whatsappHref ? (
                <li>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2 font-serif text-[0.9375rem] text-ink-soft transition-colors hover:text-burgundy"
                  >
                    <WhatsappIcon className="size-4" />
                    WhatsApp
                  </a>
                </li>
              ) : null}
              <li className="inline-flex items-center gap-1.5 font-serif text-[0.9375rem] text-ink-muted">
                <MapPin aria-hidden className="size-3.5" strokeWidth={1.5} />
                {site.city}, {site.country}
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-4 border-t border-stone py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-muted">
            © {year} MILLE. Todos los derechos reservados.
          </p>
          <p className="eyebrow flex items-center gap-4 text-ink-muted">
            <span aria-hidden className="h-px w-10 bg-burgundy/50" />
            {site.signature}
          </p>
        </div>
      </Container>
    </footer>
  );
}
