"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { InventoryCTALink } from "@/components/vehicle/InventoryCTALink";
import { mainNav, site } from "@/data/site";
import { cn } from "@/lib/cn";
import { useDialog } from "@/components/ui/use-dialog";

export function MobileMenu({
  tone = "cream",
  cta,
}: {
  tone?: "cream" | "dark";
  cta: { label: string; href: string };
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [seenPath, setSeenPath] = useState(pathname);

  // Any navigation closes the panel, including back/forward. Adjusted during
  // render rather than in an effect, which would cause a cascading render.
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  // Escape, scroll bloqueado, foco dentro y devuelto al cerrar.
  useDialog(panelRef, open, () => setOpen(false));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        aria-expanded={open}
        className={cn(
          "-mr-2 inline-flex size-10 items-center justify-center lg:hidden",
          tone === "dark" ? "text-cream" : "text-ink",
        )}
      >
        <Menu aria-hidden className="size-6" strokeWidth={1.25} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-100 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-x-0 top-0 flex max-h-dvh flex-col overflow-y-auto bg-cream pb-10 shadow-raised">
            <div className="flex h-18 items-center justify-between border-b border-stone px-5 sm:px-8">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="-mr-2 inline-flex size-10 items-center justify-center text-ink"
              >
                <X aria-hidden className="size-6" strokeWidth={1.25} />
              </button>
            </div>

            <nav aria-label="Principal móvil" className="px-5 sm:px-8">
              <ul className="divide-y divide-stone">
                {mainNav.map((item) => {
                  const isMille = item.href === "/#mille";
                  const linkClassName = "block py-5 font-display text-2xl text-ink";
                  return (
                    <li key={item.href}>
                      {isMille ? (
                        // Native anchor: a plain document navigation from any
                        // other page, so the browser's own hash scroll lands
                        // it — no client router, no reveal timing to race.
                        <a
                          href={item.href}
                          onClick={() => {
                            setOpen(false);
                            // Already there: clicking an identical href is a
                            // no-op navigation, so scroll manually instead of
                            // depending on one.
                            if (pathname === "/" && window.location.hash === "#mille") {
                              document
                                .getElementById("mille")
                                ?.scrollIntoView({ block: "start" });
                            }
                          }}
                          className={linkClassName}
                        >
                          {item.label}
                        </a>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={linkClassName}
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="mt-8 px-5 sm:px-8">
              {cta.href === "/vehiculos" ? (
                <InventoryCTALink
                  className="w-full"
                  size="lg"
                  onClick={() => setOpen(false)}
                >
                  {cta.label}
                </InventoryCTALink>
              ) : (
                <ButtonLink href={cta.href} className="w-full" size="lg">
                  {cta.label}
                </ButtonLink>
              )}
              <p className="eyebrow mt-8 text-ink-muted">{site.cityShort}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
