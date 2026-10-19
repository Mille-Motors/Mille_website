import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { BackToTop } from "@/components/layout/BackToTop";
import { InstagramIcon, WhatsappIcon } from "@/components/ui/BrandIcons";
import { mainNav, site } from "@/data/site";
import { CONSUMER_AUTHORITY } from "@/lib/legal";
import { generalWhatsappUrl } from "@/lib/whatsapp";

const whatsappHref = generalWhatsappUrl();

const year = new Date().getFullYear();

const linkClass =
  "group inline-flex min-h-11 items-center gap-4 hover:underline hover:underline-offset-[0.4em] decoration-cream/50";

/**
 * El cierre del sitio: oscuro, con las rutas, los canales y el nombre de
 * MILLE a todo el ancho. No es un mapa del sitio: es la última página de la
 * revista.
 */
export function Footer() {
  return (
    <footer className="bg-dark text-cream">
      <div className="wrap pt-[clamp(3.5rem,6vw,6.5rem)]">
        <div className="grid gap-12 pb-[clamp(3rem,5vw,5rem)] sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_auto] lg:gap-[5vw]">
          <p className="text-[clamp(1.375rem,1vw+1rem,1.75rem)] leading-snug sm:col-span-2 lg:col-span-1">
            {site.tagline}.
            <span className="mt-2 block text-base text-cream/60">
              {site.city}, {site.country}
            </span>
          </p>

          <nav aria-label="Pie de página">
            <ul className="grid gap-1">
              {mainNav.map((item) => (
                <li key={item.href}>
                  {item.href.startsWith("/#") ? (
                    <a href={item.href} className={linkClass}>
                      {item.label}
                    </a>
                  ) : (
                    <Link href={item.href} className={linkClass}>
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <ul className="grid content-start gap-1">
            {site.instagram ? (
              <li>
                <a
                  href={site.instagram.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={linkClass}
                >
                  <InstagramIcon className="size-5" />
                  Instagram
                  <ArrowRight
                    aria-hidden
                    strokeWidth={1.3}
                    className="arrow-slide-icon size-5"
                  />
                </a>
              </li>
            ) : null}
            {whatsappHref ? (
              <li>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  data-wa-source="footer"
                  data-wa-intent="general"
                  className={linkClass}
                >
                  <WhatsappIcon className="size-5" />
                  WhatsApp
                  <ArrowRight
                    aria-hidden
                    strokeWidth={1.3}
                    className="arrow-slide-icon size-5"
                  />
                </a>
              </li>
            ) : null}
            {site.email ? (
              <li>
                <a href={`mailto:${site.email}`} className={linkClass}>
                  <Mail className="size-5" strokeWidth={1.4} />
                  Correo
                  <ArrowRight
                    aria-hidden
                    strokeWidth={1.3}
                    className="arrow-slide-icon size-5"
                  />
                </a>
              </li>
            ) : null}
            <li>
              <Link href="/terminos" className={linkClass}>
                Términos y Condiciones
              </Link>
            </li>
            <li>
              {/* El nombre del documento es el de la norma: lo que esta
                  política regula es el TRATAMIENTO de datos personales, y es
                  como la nombran la Ley 1581 de 2012 y su reglamento. */}
              <Link href="/privacidad" className={linkClass}>
                Tratamiento de Datos
              </Link>
            </li>
            <li>
              <Link href="/cookies" className={linkClass}>
                Política de Cookies
              </Link>
            </li>
            {/* El art. 50, parágrafo, de la Ley 1480 de 2011 pide un enlace
                visible y fácilmente identificable a la autoridad de
                protección al consumidor. El pie es donde se ve desde
                cualquier página. No hay banner de cookies que enlazar aquí:
                el sitio solo usa almacenamiento estrictamente necesario. */}
            <li>
              <a
                href={CONSUMER_AUTHORITY.url}
                target="_blank"
                rel="noreferrer noopener"
                className={linkClass}
              >
                {CONSUMER_AUTHORITY.shortName}
                <ArrowRight
                  aria-hidden
                  strokeWidth={1.3}
                  className="arrow-slide-icon size-5"
                />
              </a>
            </li>
          </ul>

          <BackToTop className="group inline-flex min-h-11 cursor-pointer items-center gap-3 justify-self-start text-[1.125rem] sm:justify-self-end lg:self-start" />
        </div>

        {/* El nombre vuelve a todo el ancho: lo último que se ve. Es
            decorativo; el texto de verdad ya está arriba. */}
        <p
          aria-hidden
          className="font-wordmark select-none text-center text-[clamp(4.5rem,23.5vw,22rem)] leading-[0.82] tracking-[0.04em] text-cream/7"
        >
          MILLE
        </p>

        <div className="flex flex-col gap-2 border-t border-cream/15 py-6 text-sm text-cream/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} MILLE. Todos los derechos reservados.</p>
          {/* El margen derecho libra el botón flotante de WhatsApp, que se
              queda fijo sobre esta esquina al llegar al final de la página. */}
          <p className="sm:pr-20 lg:pr-44">{site.signature}</p>
        </div>
      </div>
    </footer>
  );
}
