"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Ellipsis } from "lucide-react";
import { cn } from "@/lib/cn";

export type MenuEntry =
  | { kind: "separator" }
  /** Un rótulo que agrupa lo que viene debajo. No se puede elegir. */
  | { kind: "label"; text: string }
  | {
      kind?: "item";
      label: string;
      onSelect: () => void;
      /** Lo destructivo se separa y se pinta en vinotinto. */
      danger?: boolean;
      /**
       * Si lo lleva, elegir la acción no la ejecuta: el menú cambia a una
       * pregunta y solo el segundo botón la ejecuta. La confirmación vive en
       * el mismo sitio donde se pidió y no en un diálogo aparte.
       */
      confirm?: { title: string; description?: string; confirmLabel: string };
    };

const GAP = 6;
const MARGIN = 8;

/**
 * El menú «···» de una fila.
 *
 * Se dibuja en un portal con posición fija: la tabla vive dentro de un
 * contenedor que recorta lo que se sale, y un menú absoluto quedaría cortado
 * en la última fila. Se alinea al borde derecho del botón, abre hacia arriba
 * si abajo no cabe, y se cierra al hacer clic fuera, con Escape o si la
 * página se mueve debajo de él.
 *
 * Teclado: el foco entra al primer elemento; las flechas, Inicio y Fin
 * recorren; Escape cierra y devuelve el foco al botón.
 */
export function ActionMenu({
  label,
  items,
  disabled,
  triggerClassName,
}: {
  /** Lo que anuncia el botón: «Más acciones para BMW X5». */
  label: string;
  items: MenuEntry[];
  disabled?: boolean;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  function close(returnFocus: boolean) {
    setOpen(false);
    setConfirming(null);
    if (returnFocus) triggerRef.current?.focus();
  }

  // Colocar el panel antes de que se pinte. Se escribe directamente en el
  // elemento: el cálculo depende de su tamaño ya medido, y un estado de
  // React obligaría a pintar una vez en (0, 0) antes de moverlo.
  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!open || !trigger || !panel) return;

    const anchor = trigger.getBoundingClientRect();
    const { width, height } = panel.getBoundingClientRect();

    const below = anchor.bottom + GAP;
    const fitsBelow = below + height <= window.innerHeight - MARGIN;
    const above = anchor.top - GAP - height;
    const top = fitsBelow || above < MARGIN ? below : above;

    const left = Math.min(
      Math.max(MARGIN, anchor.right - width),
      window.innerWidth - width - MARGIN,
    );

    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
    panel.style.visibility = "visible";

    // Foco al primer elemento —o a «Cancelar» si es la pregunta—.
    panel
      .querySelector<HTMLElement>("[data-autofocus], [role='menuitem']")
      ?.focus({ preventScroll: true });
  }, [open, confirming]);

  useEffect(() => {
    if (!open) return;

    const dismiss = () => {
      setOpen(false);
      setConfirming(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      dismiss();
    };

    document.addEventListener("pointerdown", onPointerDown);
    // Con el menú abierto, cualquier desplazamiento lo deja colgado de un
    // sitio donde ya no está su botón.
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);

  function onPanelKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key === "Tab") {
      // El foco vuelve al botón y el Tab sigue desde ahí; si se quedara en el
      // portal, el siguiente salto saldría de la página.
      close(true);
      return;
    }

    const controls = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(
        "[role='menuitem'], [data-nav]",
      ) ?? [],
    );
    if (controls.length === 0) return;
    const index = controls.indexOf(document.activeElement as HTMLElement);

    const move = (to: number) => {
      event.preventDefault();
      controls[(to + controls.length) % controls.length]?.focus({
        preventScroll: true,
      });
    };
    if (event.key === "ArrowDown") move(index + 1);
    else if (event.key === "ArrowUp") move(index === -1 ? -1 : index - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(controls.length - 1);
  }

  const asked = confirming === null ? null : items[confirming];
  const question =
    asked && asked.kind !== "separator" && asked.kind !== "label"
      ? asked.confirm
      : undefined;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={triggerClassName}
      >
        <Ellipsis aria-hidden className="size-4.5" strokeWidth={1.8} />
      </button>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={menuId}
              role={question ? "alertdialog" : "menu"}
              aria-label={question ? question.title : label}
              onKeyDown={onPanelKeyDown}
              // Invisible hasta que el efecto de arriba lo coloca.
              style={{ top: 0, left: 0, visibility: "hidden" }}
              className="menu-pop fixed z-50 w-60 rounded-xl border border-stone bg-paper p-1.5 shadow-raised"
            >
              {question ? (
                <div className="px-2.5 pt-2 pb-1">
                  <p className="text-[0.9375rem] leading-snug font-semibold text-ink">
                    {question.title}
                  </p>
                  {question.description ? (
                    <p className="mt-1 text-sm leading-snug text-ink-muted">
                      {question.description}
                    </p>
                  ) : null}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      data-autofocus
                      data-nav
                      onClick={() => setConfirming(null)}
                      className="press h-9 flex-1 rounded-lg border border-stone-strong text-sm font-medium text-ink hover:border-ink/50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      data-nav
                      onClick={() => {
                        const entry = items[confirming ?? -1];
                        close(true);
                        if (
                          entry &&
                          entry.kind !== "separator" &&
                          entry.kind !== "label"
                        ) {
                          entry.onSelect();
                        }
                      }}
                      className="press h-9 flex-1 rounded-lg bg-burgundy text-sm font-medium text-cream hover:bg-burgundy-dark"
                    >
                      {question.confirmLabel}
                    </button>
                  </div>
                </div>
              ) : (
                items.map((entry, index) =>
                  entry.kind === "separator" ? (
                    <div
                      key={`sep-${index}`}
                      role="separator"
                      className="my-1.5 border-t border-stone"
                    />
                  ) : entry.kind === "label" ? (
                    <p
                      key={`label-${index}`}
                      role="presentation"
                      className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-ink-muted"
                    >
                      {entry.text}
                    </p>
                  ) : (
                    <button
                      key={entry.label}
                      type="button"
                      role="menuitem"
                      tabIndex={-1}
                      onClick={() => {
                        if (entry.confirm) {
                          setConfirming(index);
                          return;
                        }
                        close(true);
                        entry.onSelect();
                      }}
                      className={cn(
                        "flex h-9 w-full items-center rounded-lg px-2.5 text-left text-[0.9375rem] transition-colors focus-visible:outline-none",
                        entry.danger
                          ? "text-burgundy hover:bg-burgundy/8 focus-visible:bg-burgundy/8"
                          : "text-ink hover:bg-sand focus-visible:bg-sand",
                      )}
                    >
                      {entry.label}
                    </button>
                  ),
                )
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
