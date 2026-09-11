"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * `useLayoutEffect` on the client, `useEffect` (a no-op during SSR) on the
 * server — the standard guard to get layout-effect timing without React's
 * "useLayoutEffect does nothing on the server" warning.
 */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * One observer for every `data-reveal` element on the page.
 *
 * Strictly progressive: the CSS that hides elements is gated on
 * `html[data-reveal="on"]`, and THIS COMPONENT is what sets that flag. Until
 * it does, nothing is hidden — if the client bundle never arrives, or this
 * runs before the browser is ready to answer "is it on screen", content
 * simply stays visible.
 *
 * Deliberately does NOT decide "already on screen" itself via
 * getBoundingClientRect() in the layout effect. Measured directly: in
 * Turbopack dev, this effect can run before the page's CSS has finished
 * applying (the stylesheet arrives on its own timeline, independent of when
 * React hydrates) — at that instant `document.documentElement.scrollHeight`
 * read a collapsed 1602px against a real height of 8139px, and every
 * element's rect.top read 0, so a manual check would have called all 39
 * elements "in view" and animated none of them, silently breaking the
 * reveal-on-scroll experience on a cold dev-server start. The browser's own
 * IntersectionObserver doesn't have this problem — its intersection
 * computation is tied to actual committed layout, not a snapshot my code
 * takes at a moment it can't vouch for. So every element is handed to the
 * observer; its first callback (always async, always after layout has
 * settled) is what classifies "already visible, show it outright" versus
 * "below the fold, wait for the reader to scroll here" — and only then does
 * the flag turn on, in that same callback, so there is never a frame where
 * something is hidden by CSS without already being correctly marked.
 *
 * Re-registers on every pathname change: this lives in the root layout,
 * which the App Router does not remount on client-side navigation, so
 * without it a route change would leave the new page's elements unobserved.
 */
export function Reveal() {
  const pathname = usePathname();

  useIsomorphicLayoutEffect(() => {
    // Reduced motion: never opt in, so nothing is ever hidden.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Client-side navigation never gets the browser's native scroll-to-hash
    // (that only happens on a full page load) — the router scrolls the page
    // itself, in its own effect. Resolving it here too, synchronously, means
    // that by the time the observer's first callback runs, the page is
    // already at its landing position, so the destination classifies as
    // "already visible" instead of racing the router's own scroll.
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      target?.scrollIntoView({ behavior: "instant", block: "start" });
    }

    const targets = [
      ...document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-reveal-in])"),
    ];
    if (targets.length === 0) return;

    if (!("IntersectionObserver" in window)) {
      // No fine-grained visibility signal available: show everything rather
      // than leave it hidden with no way to reveal it.
      targets.forEach((el) => el.setAttribute("data-reveal-in", "instant"));
      document.documentElement.dataset.reveal = "on";
      return;
    }

    // The observer's first callback reports every target's CURRENT state —
    // that first batch is a classification pass, not a scroll discovery.
    let classifying = true;

    const observer = new IntersectionObserver(
      (entries) => {
        if (classifying) {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              // Already the destination: show it outright, no transition —
              // see the CSS rule for "instant" for why.
              entry.target.setAttribute("data-reveal-in", "instant");
              observer.unobserve(entry.target);
            }
            // Not intersecting yet: leave unmarked and still observed, so a
            // later, genuine scroll into view animates normally below.
          }
          classifying = false;
          // Every element already destined to be visible is now correctly
          // marked. Only now is it safe to let CSS start hiding the rest.
          document.documentElement.dataset.reveal = "on";
          return;
        }

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
