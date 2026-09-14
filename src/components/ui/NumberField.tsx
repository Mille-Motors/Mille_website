"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { groupDigits, onlyDigits, parseGrouped } from "@/lib/format";

/**
 * Campo numérico que se lee como se lee el dinero en Colombia.
 *
 * Mientras se escribe muestra 289.900.000; hacia fuera entrega 289900000.
 * La base guarda el número, nunca el texto formateado.
 *
 * Dos decisiones que evitan los problemas clásicos de este componente:
 *
 * 1. El símbolo ($ o km) es un adorno dibujado al lado del input, no parte de
 *    su valor. Así seleccionar todo, pegar o borrar nunca puede dejar el
 *    campo en un estado del que no se pueda salir.
 *
 * 2. El cursor se restituye contando dígitos, no posiciones. Al insertar un
 *    punto de miles la cadena se alarga, y mover el cursor "una posición" lo
 *    dejaría descolocado; en cambio "después del tercer dígito" sigue
 *    significando lo mismo antes y después de formatear.
 *
 * `value` es `number | null`: null es "sin rellenar" y 0 es cero de verdad.
 * Confundirlos es justo lo que impedía guardar un vehículo con 0 km.
 */
interface NumberFieldProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  prefix?: string;
  suffix?: string;
  error?: string;
  required?: boolean;
  max?: number;
  containerClassName?: string;
  name?: string;
}

/** Cuántos dígitos hay antes de esta posición del texto. */
function digitsBefore(text: string, position: number): number {
  let count = 0;
  for (let i = 0; i < position && i < text.length; i += 1) {
    if (text[i] >= "0" && text[i] <= "9") count += 1;
  }
  return count;
}

/** La posición que queda justo después del enésimo dígito. */
function positionAfterDigits(text: string, count: number): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] >= "0" && text[i] <= "9") {
      seen += 1;
      if (seen === count) return i + 1;
    }
  }
  return text.length;
}

export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  error,
  required,
  max,
  containerClassName,
  name,
}: NumberFieldProps) {
  const generatedId = useId();
  const inputId = name ?? generatedId;
  const errorId = `${inputId}-error`;

  const inputRef = useRef<HTMLInputElement>(null);
  // Cuántos dígitos debían quedar a la izquierda del cursor tras reformatear.
  const caretDigits = useRef<number | null>(null);

  const [display, setDisplay] = useState(() =>
    value === null ? "" : groupDigits(String(value)),
  );
  // Permite detectar un cambio venido de fuera (cargar el vehículo a editar)
  // sin pisar lo que la persona está escribiendo ahora mismo.
  const [lastValue, setLastValue] = useState(value);

  if (value !== lastValue) {
    setLastValue(value);
    const incoming = value === null ? "" : groupDigits(String(value));
    if (parseGrouped(display) !== value) setDisplay(incoming);
  }

  useLayoutEffect(() => {
    if (caretDigits.current === null) return;
    const element = inputRef.current;
    if (element) {
      const position = positionAfterDigits(element.value, caretDigits.current);
      element.setSelectionRange(position, position);
    }
    caretDigits.current = null;
  });

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    const caret = event.target.selectionStart ?? raw.length;

    const digits = onlyDigits(raw);
    if (max !== undefined && digits !== "" && Number(digits) > max) {
      // Se ignora la pulsación que excede el tope en vez de recortar el
      // número por detrás, que dejaría una cifra que nadie escribió.
      return;
    }

    const wanted = digitsBefore(raw, caret);
    const formatted = groupDigits(digits);
    // Si se borró un punto de miles, el dígito que lo precede es el que
    // desaparece; contar dígitos ya lo refleja.
    caretDigits.current = Math.min(wanted, onlyDigits(formatted).length);

    setDisplay(formatted);
    const parsed = formatted === "" ? null : parseGrouped(formatted);
    setLastValue(parsed);
    onChange(parsed);
  }

  const showAdornments = display !== "";

  return (
    <div className={containerClassName}>
      <label htmlFor={inputId} className="label-caps mb-2 block text-ink-soft">
        {label}
        {required ? <span className="ml-1 text-burgundy">*</span> : null}
      </label>
      <div className="relative">
        {prefix && showAdornments ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-ink-muted"
          >
            {prefix}
          </span>
        ) : null}
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          value={display}
          onChange={handleChange}
          inputMode="numeric"
          autoComplete="off"
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-12 w-full rounded-xs border border-stone bg-paper px-4 text-sm text-ink transition-colors",
            "placeholder:text-ink-muted/70 hover:border-stone-strong focus:border-burgundy focus:outline-none",
            "tabular",
            prefix && showAdornments && "pl-9",
            suffix && showAdornments && "pr-12",
            error && "border-burgundy",
          )}
        />
        {suffix && showAdornments ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-ink-muted"
          >
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-burgundy">
          {error}
        </p>
      ) : null}
    </div>
  );
}
