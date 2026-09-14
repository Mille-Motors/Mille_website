"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Un botón que pregunta antes de hacer algo irreversible.
 *
 * El Admin ya confirmaba al borrar vehículos y solicitudes, pero eliminar una
 * fotografía, borrar una categoría o restaurar una imagen del sitio se
 * ejecutaban con un solo clic —y las dos primeras destruyen además el archivo
 * del bucket—. La inconsistencia era el problema: el mismo panel pedía
 * confirmación para unas cosas y no para otras.
 *
 * La confirmación aparece en el sitio del botón, sin `window.confirm`, que es
 * el patrón que el Admin ya usaba.
 */
export function ConfirmButton({
  question,
  confirmLabel = "Sí, eliminar",
  onConfirm,
  disabled,
  className,
  ariaLabel,
  children,
}: {
  /** Qué se va a hacer y por qué no tiene vuelta atrás. */
  question: string;
  confirmLabel?: string;
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-serif text-xs text-ink-soft">{question}</span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setConfirming(false);
            onConfirm();
          }}
          className="label-caps rounded-xs bg-burgundy px-3 py-1.5 text-[10px] text-cream disabled:opacity-40"
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="label-caps rounded-xs border border-stone px-3 py-1.5 text-[10px] text-ink transition-colors hover:border-ink/40"
        >
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={() => setConfirming(true)}
      className={cn(className)}
    >
      {children}
    </button>
  );
}
