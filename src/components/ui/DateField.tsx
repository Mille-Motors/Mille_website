"use client";

import { useId, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  dateInputError,
  displayToIso,
  isoToDisplay,
  maskDateInput,
} from "@/lib/date-input";

/**
 * Una fecha que se puede escribir.
 *
 * El `<input type="date">` nativo obliga a trabajar por segmentos —se teclea
 * el día, el foco salta al mes, corregir exige volver con el ratón— y en una
 * ficha con tres fechas de documentación eso se nota.
 *
 * Así que el campo visible es de texto y se teclea seguido: `01102026` se
 * convierte en `01/10/2026` mientras se escribe. El calendario del navegador
 * sigue ahí, detrás del botón, para quien prefiera buscar el día; es el mismo
 * `<input type="date">` de siempre, oculto, así que en móvil se abre el
 * selector del sistema sin traer ninguna librería.
 *
 * Hacia fuera siempre viaja ISO `YYYY-MM-DD`, y la conversión es de cadena a
 * cadena: aquí no se construye ningún `Date`, porque `new Date("2026-10-01")`
 * es medianoche UTC y en Bogotá cae el 30 de septiembre.
 *
 * Mientras lo escrito no sea una fecha completa, hacia fuera va `null`: un
 * campo a medio teclear es un campo sin fecha, no una fecha rota.
 */
export function DateField({
  label,
  value,
  onChange,
  error,
  containerClassName,
}: {
  label: string;
  /** ISO `YYYY-MM-DD`, o `null`. */
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
  containerClassName?: string;
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const pickerRef = useRef<HTMLInputElement>(null);

  // Lo tecleado vive aquí mientras se escribe; `value` solo cambia cuando ya
  // es una fecha de verdad. Sin esto, teclear el primer dígito borraría el
  // campo en cada pulsación.
  const [display, setDisplay] = useState(() => isoToDisplay(value));
  const [lastValue, setLastValue] = useState(value);

  // Un cambio venido de fuera —cargar el vehículo a editar— sí reescribe lo
  // que se ve, pero no pisa lo que se está tecleando ahora mismo.
  if (value !== lastValue) {
    setLastValue(value);
    if (displayToIso(display) !== value) setDisplay(isoToDisplay(value));
  }

  const typedError = dateInputError(display);
  const shown = error ?? typedError ?? undefined;

  function handleType(raw: string) {
    const masked = maskDateInput(raw);
    setDisplay(masked);
    const iso = displayToIso(masked);
    setLastValue(iso);
    onChange(iso);
  }

  return (
    <div className={containerClassName}>
      <label htmlFor={inputId} className="label-caps mb-2 block text-ink-soft">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD/MM/AAAA"
          value={display}
          onChange={(event) => handleType(event.target.value)}
          aria-invalid={shown ? true : undefined}
          aria-describedby={shown ? errorId : undefined}
          className={cn(
            "h-12 w-full rounded-xs border border-stone bg-paper pr-12 pl-4 text-sm text-ink transition-colors",
            "placeholder:text-ink-muted/70 hover:border-stone-strong focus:border-burgundy focus:outline-none",
            "tabular",
            shown && "border-burgundy",
          )}
        />
        <button
          type="button"
          // `showPicker()` abre el calendario nativo sin enseñar el input.
          // Donde no exista, el `focus()` deja el control accesible igual.
          onClick={() => {
            const picker = pickerRef.current;
            if (!picker) return;
            if (typeof picker.showPicker === "function") picker.showPicker();
            else picker.focus();
          }}
          aria-label={`Abrir calendario de ${label.toLowerCase()}`}
          className="absolute top-1/2 right-2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-xs text-ink-muted transition-colors hover:text-burgundy"
        >
          <CalendarDays aria-hidden className="size-4" strokeWidth={1.5} />
        </button>
        {/* El calendario del sistema. Nunca se ve, pero es el que se abre y
            el que hace que en móvil funcione el selector del teléfono. */}
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden
          value={value ?? ""}
          onChange={(event) => {
            const iso = event.target.value || null;
            setDisplay(isoToDisplay(iso));
            setLastValue(iso);
            onChange(iso);
          }}
          className="pointer-events-none absolute right-3 bottom-0 size-0 opacity-0"
        />
      </div>
      {shown ? (
        <p id={errorId} className="mt-1.5 text-xs text-burgundy">
          {shown}
        </p>
      ) : null}
    </div>
  );
}
