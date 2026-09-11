"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * One observer for every `data-reveal` element on the page.
 *
 * The hiding is done by CSS gated on `html[data-reveal="on"]`, which an inline
 * script in the document sets before first paint. So with JavaScript disabled
 * or blocked, nothing is ever hidden and the page reads normally; this
 * component only marks elements as they come into view.
 *
 * Re-registers on every pathname change. This component lives in the root
 * layout, which the App Router does not remount on client-side navigation —
 * without this, a route change (e.g. /contacto -> /#mille) would leave the
 * new page's [data-reveal] elements unobserved and permanently stuck at
 * opacity: 0, since the original effect already ran and won't run again.
 */
export function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.reveal !== "on") return;

    const targets = document.querySelectorAll<HTMLElement>(
      "[data-reveal]:not([data-reveal-in])",
    );
    if (targets.length === 0) return;

    // Fail-safe: the reveal system must never be the reason content stays
    // invisible. No IntersectionObserver support means no reveal-on-scroll,
    // so show everything immediately rather than leave it hidden.
    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.setAttribute("data-reveal-in", ""));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-reveal-in", "");
          observer.unobserve(entry.target);
        }
      },
      // Fires a little before the element is fully on screen, so the movement
      // finishes while the reader is still arriving at it.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}

/**
 * Runs before paint: opts the document into the reveal styles, but only when
 * the reader has not asked for reduced motion.
 */
export const revealBootstrapScript = `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.dataset.reveal="on"}}catch(e){}`;
