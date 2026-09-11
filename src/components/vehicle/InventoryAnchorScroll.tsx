"use client";

import { useEffect } from "react";

/**
 * Next's built-in scroll-to-hash on a cross-page Link navigation isn't
 * reliable here, so /vehiculos claims the anchor itself: on mount, if the
 * URL already asks for #inventario (the "Ver inventario" CTA from anywhere
 * else on the site), jump straight past the Carros/Motos/Todo choice to the
 * filters/grid.
 */
export function InventoryAnchorScroll() {
  useEffect(() => {
    if (window.location.hash !== "#inventario") return;
    document
      .getElementById("inventario")
      ?.scrollIntoView({ behavior: "instant", block: "start" });
  }, []);

  return null;
}
