"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Los controles de la barra de filtros del inventario.
 *
 * Todos comparten un mismo aspecto: un campo de 48 px con su icono a la
 * izquierda, el valor en el medio y una flecha a la derecha. Lo que cambia es
 * lo que pasa al pulsarlo —un desplegable del navegador, o un pequeño panel
 * con «Desde» y «Hasta»—, no cómo se ve.
 *
 * Un campo con un valor puesto se reconoce sin leerlo: el filete se vuelve
 * vinotinto. Uno sin nada que elegir conserva su sitio y su altura pero pierde
 * el hover y dice qué falta.
 */

const shell =
  "relative flex h-12 w-full items-center rounded-xl border bg-paper text-base transition-colors";

function shellTone({
  active,
  disabled,
}: {
  active: boolean;
  disabled?: boolean;
}) {
  if (disabled) return "cursor-not-allowed border-ink/10 text-ink-muted/60";
  if (active) return "border-burgundy/50 text-ink";
  return "border-ink/15 text-ink-soft hover:border-ink/40 hover:text-ink";
}

// `z-10`: el desplegable de debajo es `relative` y, sin esto, pinta su fondo
// encima del icono y lo tapa.
const iconClass =
  "pointer-events-none absolute top-1/2 left-3.5 z-10 size-4.5 -translate-y-1/2";

/** Un campo con su rótulo encima. */
export function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="mb-1.5 text-sm text-ink-muted">{label}</p>
      {children}
    </div>
  );
}

/** Un desplegable de «Todas / una de estas», con icono si lo tiene. */
export function SelectControl({
  label,
  value,
  onChange,
  icon: Icon,
  disabled,
  children,
  className,
}: {
  /** Lo que anuncia un lector de pantalla: el rótulo visible no está dentro. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon?: LucideIcon;
  /** Sin nada que elegir. Conserva el filete y el alto; pierde el hover. */
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const active = value !== "";
  return (
    <div className={cn("relative", className)}>
      {Icon ? (
        <Icon
          aria-hidden
          strokeWidth={1.4}
          className={cn(
            iconClass,
            active && !disabled ? "text-burgundy" : "text-ink-muted",
          )}
        />
      ) : null}
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          shell,
          shellTone({ active, disabled }),
          "appearance-none pr-10",
          Icon ? "pl-11" : "pl-4",
          !disabled && "cursor-pointer",
        )}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        strokeWidth={1.5}
        className={cn(
          "pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2",
          disabled ? "text-ink-muted/40" : "text-ink-muted",
        )}
      />
    </div>
  );
}

/**
 * Un rango —precio, año, kilometraje— que se ve como un solo campo,
 * «Desde – Hasta», y al pulsarlo abre un panel pequeño con las dos cotas.
 *
 * Dos desplegables sueltos ocupaban el doble de la barra por una sola idea.
 * Las dos cotas siguen siendo `<select>` nativos dentro del panel, así que el
 * teclado y los lectores de pantalla las tratan como lo que son. Cada cambio
 * se aplica al momento, como el resto de la barra; el panel se queda abierto
 * para poder ajustar las dos cotas seguidas y se cierra al pulsar fuera, con
 * Escape o al pulsar el campo otra vez.
 */
export function RangeControl({
  label,
  icon: Icon,
  summary,
  placeholder,
  disabled,
  onClear,
  children,
  className,
}: {
  label: string;
  icon: LucideIcon;
  /** Lo que dice el campo cuando hay un rango puesto; `null` si no hay. */
  summary: string | null;
  /** «Desde – Hasta», o lo que falte cuando no hay datos. */
  placeholder: string;
  disabled?: boolean;
  onClear: () => void;
  /** Las dos cotas, de a una celda cada una. */
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const active = summary !== null;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`${label}: ${summary ?? placeholder}`}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          shell,
          shellTone({ active, disabled }),
          "pr-10 pl-11 text-left",
          !disabled && "cursor-pointer",
        )}
      >
        <Icon
          aria-hidden
          strokeWidth={1.4}
          className={cn(
            iconClass,
            active && !disabled ? "text-burgundy" : "text-ink-muted",
          )}
        />
        <span className="truncate">{summary ?? placeholder}</span>
        <ChevronDown
          aria-hidden
          strokeWidth={1.5}
          className={cn(
            "pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 transition-transform",
            disabled ? "text-ink-muted/40" : "text-ink-muted",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className="absolute top-full left-0 z-30 mt-2 w-[min(21rem,calc(100vw-3rem))] rounded-2xl border border-ink/15 bg-cream p-4 shadow-float"
        >
          <div className="grid grid-cols-2 gap-3">{children}</div>
          {active ? (
            <button
              type="button"
              onClick={onClear}
              className="mt-3 rounded-md text-sm text-ink-muted underline underline-offset-4 transition-colors hover:text-burgundy"
            >
              Quitar {label.toLowerCase()}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
