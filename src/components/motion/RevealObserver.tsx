"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Enciende las animaciones de entrada del sitio público.
 *
 * Una sola pieza de cliente para toda la página: los componentes de servidor
 * solo marcan lo que se revela con `data-reveal` (y las secciones que pasan
 * de oscuro a crema con `data-tone-zone`), y este observador pone `data-in`
 * la primera vez que cada elemento entra en pantalla. Nada se anima dos
 * veces, y nada de lo que se ve depende de que el observador funcione: el
 * CSS solo oculta cuando el script del <head> ya marcó la página.
 *
 * Observa también lo que se añade después —los resultados de un filtro, una
 * ficha que carga— con un MutationObserver, que es más barato que obligar a
 * cada componente a ser un componente de cliente.
 */
const SELECTOR = "[data-reveal]:not([data-in]), [data-tone-zone]:not([data-in])";

export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const show = (element: Element) => element.setAttribute("data-in", "");

    // Sin movimiento no hay nada que esperar: todo queda visible ya.
    if (reduced.matches || !("IntersectionObserver" in window)) {
      document.querySelectorAll(SELECTOR).forEach(show);
      return;
    }

    const intersections = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target);
          intersections.unobserve(entry.target);
        }
      },
      // En cuanto asoma por el borde inferior: así un desplazamiento rápido
      // no deja huecos vacíos esperando a que lleguen.
      { rootMargin: "0px 0px 0px 0px", threshold: 0 },
    );

    const watch = (root: ParentNode) => {
      if (root instanceof Element && root.matches(SELECTOR)) {
        intersections.observe(root);
      }
      root.querySelectorAll(SELECTOR).forEach((element) => {
        intersections.observe(element);
      });
    };

    watch(document);

    let queued = false;
    const mutations = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        watch(document);
      });
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      intersections.disconnect();
      mutations.disconnect();
    };
  }, [pathname]);

  return null;
}
