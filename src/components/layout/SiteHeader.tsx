"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { SiteMenu } from "@/components/layout/SiteMenu";
import type { NavPreviews } from "@/components/layout/Navbar";
import { cn } from "@/lib/cn";

/**
 * La barra superior: Menú a la izquierda, el logotipo en el centro y una
 * única acción a la derecha. Nada más —los enlaces viven en el menú de
 * pantalla completa—, así que la barra puede ser baja y quedarse quieta.
 *
 * En la home es transparente sobre la fotografía de portada y se vuelve
 * crema en cuanto la página se mueve; en todas las demás páginas es crema
 * desde el principio. La portada de la home se desliza por debajo de ella
 * con un margen negativo igual a la altura de la barra.
 */
export function SiteHeader({ previews }: { previews: NavPreviews }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [seenPath, setSeenPath] = useState(pathname);

  // Cualquier navegación cierra el menú, incluido atrás y adelante. Se
  // ajusta durante el render y no en un efecto, que provocaría otro render
  // en cascada.
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      setScrolled(window.scrollY > 40);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const overHero = pathname === "/" && !scrolled;

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 h-header transition-[background-color,color,border-color] duration-300 ease-out",
          overHero
            ? "border-b border-transparent text-cream"
            : "border-b border-burgundy/10 bg-cream text-burgundy",
        )}
      >
        {/* Un velo neutro bajo el texto, para que se lea sobre cualquier
            fotografía de portada. Desaparece con la barra transparente. */}
        {pathname === "/" ? (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 h-[140%] bg-linear-to-b from-dark/55 to-transparent transition-opacity duration-300",
              overHero ? "opacity-100" : "opacity-0",
            )}
          />
        ) : null}

        <div className="relative grid h-full grid-cols-[1fr_auto_1fr] items-center px-5 sm:px-8 lg:px-[4.5vw]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={open}
            aria-controls="site-menu"
            className="press -ml-2 inline-flex min-h-12 cursor-pointer items-center gap-3 justify-self-start px-2 text-[0.9375rem]"
          >
            <span aria-hidden className="grid w-6 gap-[0.4375rem]">
              <i className="block h-px w-6 bg-current" />
              <i className="block h-px w-6 bg-current" />
            </span>
            <span className="hidden sm:inline">Menú</span>
          </button>

          <Logo tone={overHero ? "cream" : "wine"} size="header" priority />

          <Link
            href="/contacto"
            className="group inline-flex min-h-12 items-center gap-3 justify-self-end text-[0.9375rem]"
          >
            Hablemos
            <ArrowRight
              aria-hidden
              strokeWidth={1.3}
              className="arrow-slide-icon hidden size-5 sm:block"
            />
          </Link>
        </div>
      </header>

      {open ? (
        <SiteMenu previews={previews} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
