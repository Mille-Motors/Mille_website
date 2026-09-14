"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Lo que todo diálogo y todo menú desplegable del proyecto necesitaba y cada
 * uno resolvía a medias: bloquear el scroll, cerrar con Escape, llevar el
 * foco dentro, no dejar que se escape por detrás y devolverlo al salir.
 *
 * Sin atrapar el foco, tabular dentro de un modal acaba recorriendo los
 * enlaces de la página de debajo mientras el diálogo sigue tapándola: quien
 * navega con teclado se queda sin saber dónde está.
 *
 * Sin dependencias: la lista de elementos enfocables se recalcula en cada
 * Tab, así que un diálogo que cambia de contenido —una confirmación que
 * aparece— sigue funcionando.
 */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function useDialog(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
) {
  // Se guarda quién tenía el foco para devolvérselo al cerrar.
  const restoreTo = useRef<HTMLElement | null>(null);

  /**
   * `onClose` llega casi siempre como función en línea —`() => setOpen(false)`—
   * así que cambia de identidad en cada render. Si el efecto dependiera de
   * ella, cualquier render con el diálogo abierto lo desmontaría y volvería a
   * montarlo: devolvería el foco al disparador y lo saltaría de vuelta al
   * primer elemento. En el panel de filtros pasaba a cada selección, porque
   * elegir un valor actualiza el borrador y vuelve a renderizar.
   *
   * Guardándola en una ref, el efecto solo depende de si el diálogo está
   * abierto, y Escape sigue llamando siempre a la última versión.
   */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    restoreTo.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = () =>
      Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      );

    // El primer elemento útil, para no obligar a tabular desde fuera.
    focusable()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusable();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      // El ciclo se cierra sobre sí mismo en los dos sentidos.
      if (event.shiftKey && (active === first || !ref.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreTo.current?.focus();
    };
  }, [open, ref]);
}
