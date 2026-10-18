"use client";

import { useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { InstagramIcon, WhatsappIcon } from "@/components/ui/BrandIcons";
import { useDialog } from "@/components/ui/use-dialog";
import { mainNav, site } from "@/data/site";
import { cn } from "@/lib/cn";
import { generalWhatsappUrl } from "@/lib/whatsapp";

/**
 * El menú de pantalla completa. Se abre desde la barra superior en todas las
 * pantallas: en vez de una fila de enlaces apretada, cinco frases grandes que
 * se leen de un vistazo.
 *
 * Se pinta a sí mismo la fila superior —Cerrar, logotipo, Hablemos— en el
 * mismo sitio que la barra, de modo que parece que la barra sigue ahí y el
 * menú se abre debajo. Que sea una pieza completa, con su propio botón de
 * cerrar, es lo que deja atrapar el foco dentro sin dejar fuera ningún
 * control.
 *
 * En escritorio, cada enlace enseña a su lado una fotografía de adonde lleva.
 */
const previews: Record<string, { src: string; alt: string }> = {
  "/vehiculos": {
    src: "/images/vehicles/bmw-m4-competition/01.jpg",
    alt: "",
  },
  "/#mille": { src: "/images/brand/hero.jpg", alt: "" },
  "/#vender": { src: "/images/vehicles/porsche-macan/02.jpg", alt: "" },
  "/#cultura": {
    src: "/images/vehicles/bmw-r-1250-gs-adventure/01.jpg",
    alt: "",
  },
  "/contacto": { src: "/images/brand/night.jpg", alt: "" },
};

export function SiteMenu({ onClose }: { onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [active, setActive] = useState<string>(mainNav[0].href);

  useDialog(panel, true, onClose);

  const whatsapp = generalWhatsappUrl();

  function follow(event: MouseEvent<HTMLAnchorElement>, href: string) {
    onClose();
    // Ya en la home, un salto a "/#sección" no navega: se desplaza a mano.
    if (href.startsWith("/#") && pathname === "/") {
      event.preventDefault();
      const id = href.slice(2);
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: "start" });
        window.history.replaceState(null, "", href);
      });
    }
  }

  return (
    <div
      ref={panel}
      id="site-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menú"
      className="menu-panel fixed inset-0 z-60 flex flex-col overflow-y-auto bg-cream text-burgundy"
    >
      <div className="grid h-header shrink-0 grid-cols-[1fr_auto_1fr] items-center px-5 sm:px-8 lg:px-[4.5vw]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar menú"
          className="press -ml-2 inline-flex min-h-12 cursor-pointer items-center gap-3 justify-self-start px-2 text-[0.9375rem]"
        >
          <X aria-hidden className="size-6" strokeWidth={1.3} />
          <span className="hidden sm:inline">Cerrar</span>
        </button>
        <Logo tone="wine" size="header" />
        <Link
          href="/contacto"
          onClick={onClose}
          className="group inline-flex min-h-12 items-center gap-3 justify-self-end text-[0.9375rem]"
        >
          Hablemos
          <ArrowRight
            aria-hidden
            strokeWidth={1.3}
            className="arrow-slide-icon size-5"
          />
        </Link>
      </div>

      <div className="wrap flex flex-1 flex-col justify-between gap-10 pt-6 pb-8 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-[6vw] lg:pt-10">
        <nav aria-label="Principal" className="self-center lg:w-full">
          <ul onMouseLeave={() => setActive(mainNav[0].href)}>
            {mainNav.map((item, index) => (
              <li
                key={item.href}
                className="menu-rise"
                style={{ "--i": index } as React.CSSProperties}
              >
                {/* Los saltos a una sección de la home van como enlace nativo
                    desde cualquier otra página: el navegador resuelve el ancla
                    sin carreras con el router del cliente. */}
                {item.href.startsWith("/#") ? (
                  <a
                    href={item.href}
                    onClick={(event) => follow(event, item.href)}
                    onMouseEnter={() => setActive(item.href)}
                    onFocus={() => setActive(item.href)}
                    className={linkClass(active === item.href)}
                  >
                    <span>{item.label}</span>
                    <MenuArrow />
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    onClick={(event) => follow(event, item.href)}
                    onMouseEnter={() => setActive(item.href)}
                    onFocus={() => setActive(item.href)}
                    className={linkClass(active === item.href)}
                  >
                    <span>{item.label}</span>
                    <MenuArrow />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div
          aria-hidden
          className="relative hidden self-center overflow-hidden rounded-xl bg-dark lg:block lg:aspect-4/5 lg:max-h-[68vh] lg:w-full"
        >
          {mainNav.map((item) => {
            const preview = previews[item.href];
            if (!preview) return null;
            return (
              <Image
                key={item.href}
                src={preview.src}
                alt={preview.alt}
                fill
                sizes="36vw"
                className={cn(
                  "object-cover transition-opacity duration-500 ease-out",
                  active === item.href ? "opacity-100" : "opacity-0",
                )}
              />
            );
          })}
        </div>

        <div className="menu-rise flex flex-col gap-6 text-[0.9375rem] sm:flex-row sm:items-end sm:justify-between lg:col-span-2" style={{ "--i": mainNav.length } as React.CSSProperties}>
          <p className="text-ink-muted">
            {site.tagline}
            <br />
            {site.city}, {site.country}
          </p>
          <ul className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {site.instagram ? (
              <li>
                <a
                  href={site.instagram.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-11 items-center gap-2.5 hover:underline hover:underline-offset-4"
                >
                  <InstagramIcon className="size-5" />
                  Instagram
                </a>
              </li>
            ) : null}
            {whatsapp ? (
              <li>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer noopener"
                  data-wa-source="menu"
                  data-wa-intent="general"
                  className="inline-flex min-h-11 items-center gap-2.5 hover:underline hover:underline-offset-4"
                >
                  <WhatsappIcon className="size-5" />
                  WhatsApp
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Frases grandes; las demás se apagan mientras se mira una. */
function linkClass(isActive: boolean) {
  return cn(
    "group flex min-h-16 items-center justify-between gap-6 py-3 text-[clamp(2rem,3.6vw+0.6rem,4.75rem)] leading-[1.12] transition-opacity duration-300",
    "[@media(hover:hover)]:text-ink [@media(hover:hover)]:hover:text-burgundy",
    isActive ? "opacity-100" : "[@media(hover:hover)]:opacity-45",
  );
}

function MenuArrow() {
  return (
    <ArrowRight
      aria-hidden
      strokeWidth={1.1}
      className="arrow-slide-icon size-[clamp(1.5rem,2.2vw,2.5rem)] shrink-0 opacity-70"
    />
  );
}
