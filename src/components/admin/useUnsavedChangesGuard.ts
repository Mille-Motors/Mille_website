"use client";

import { useEffect } from "react";

/**
 * Avisar antes de abandonar una pantalla con cambios sin guardar.
 *
 * Cubre las dos salidas que el navegador y Next permiten interceptar sin
 * trucos:
 *
 *   · cerrar la pestaña o recargar, con `beforeunload`;
 *   · pulsar un enlace normal del panel, interceptando el clic.
 *
 * El clic se escucha en FASE DE CAPTURA sobre `document` para llegar antes
 * que el router de Next, que trabaja en burbujeo. Cancelar detiene las dos
 * navegaciones de una vez: la del navegador y la del router.
 *
 * Lo que NO se toca, y es deliberado:
 *
 *   · Cmd/Ctrl/Shift/Alt + clic y el botón central, que abren en otra parte
 *     y no se llevan nada de esta pantalla;
 *   · `target` distinto de `_self` — ahí entra «Ver ficha pública»;
 *   · `download`;
 *   · enlaces a otro origen;
 *   · anclas de la misma página (`#algo`) y enlaces a la propia ruta;
 *   · un clic que alguien ya canceló antes.
 *
 * LIMITACIÓN CONOCIDA: el botón «atrás» del navegador en una navegación de
 * cliente no se puede bloquear sin manipular el historial, y esos trucos
 * dejan la pila de navegación en un estado peor que el problema que
 * resuelven. El App Router no ofrece hoy una forma soportada de hacerlo.
 * Atrás sale sin preguntar; recargar, cerrar y los enlaces del panel, no.
 */
export function useUnsavedChangesGuard(active: boolean, message: string): void {
  useEffect(() => {
    if (!active) return;

    const beforeUnload = (event: BeforeUnloadEvent) => {
      // El texto lo decide el navegador desde hace años; lo único que se
      // puede hacer es pedir la confirmación.
      event.preventDefault();
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      if (window.confirm(message)) return;

      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active, message]);
}
