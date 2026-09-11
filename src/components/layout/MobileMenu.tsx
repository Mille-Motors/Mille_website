"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { mainNav, site } from "@/data/site";
import { cn } from "@/lib/cn";

export function MobileMenu({
  tone = "cream",
  cta,
}: {
  tone?: "cream" | "dark";
  cta: { label: string; href: string };
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [seenPath, setSeenPath] = useState(pathname);

  // Any navigation closes the panel, including back/forward. Adjusted during
  // render rather than in an effect, which would cause a cascading render.
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
                {mainNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        // The menu must close on every link, including one
                        // that points at the current pathname+hash (e.g.
                        // "Sobre MILLE" clicked again from #mille): a click
                        // there triggers no navigation for the pathname
                        // watcher above to react to, so it has to close here
                        // unconditionally instead of waiting on a route
                        // change that may never come.
                        setOpen(false);

                        // Same destination as where we already are: Next
                        // won't re-run its own scroll-to-hash for a URL that
                        // isn't actually changing, so do it ourselves.
                        const [path, hash] = item.href.split("#");
                        const atDestination =
                          (path || "/") === pathname && hash;
                        if (atDestination) {
                          document
                            .getElementById(hash)
                            ?.scrollIntoView({ behavior: "instant", block: "start" });
                        }
                      }}
                      className="block py-5 font-display text-2xl text-ink"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-8 px-5 sm:px-8">
              <ButtonLink href={cta.href} className="w-full" size="lg">
                {cta.label}
              </ButtonLink>
              <p className="eyebrow mt-8 text-ink-muted">{site.cityShort}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
