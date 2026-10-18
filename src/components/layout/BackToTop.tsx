"use client";

import { ArrowUp } from "lucide-react";

/** Vuelve al inicio de la página; sin animación para quien la ha desactivado. */
export function BackToTop({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      }}
      className={className}
    >
      Volver arriba
      <ArrowUp
        aria-hidden
        strokeWidth={1.3}
        className="size-5 transition-transform duration-300 ease-out group-hover:-translate-y-1"
      />
    </button>
  );
}
