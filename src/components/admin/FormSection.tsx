"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Un bloque del formulario de vehículo.
 *
 * El formulario pasó de una sección de "información básica" a nueve
 * apartados, y una pantalla con noventa campos planos no se puede rellenar:
 * no porque sean muchos, sino porque no se ve dónde empieza y acaba cada
 * idea. Aquí cada idea tiene su marco, su título y —si es técnica y
 * opcional— su propio plegado.
 *
 * Lo que siempre hace falta nace abierto y no se puede cerrar
 * (`collapsible={false}`): esconder la marca y el precio detrás de un clic
 * sería esconder el trabajo diario para ordenar lo excepcional.
 *
 * El marco es el del resto del Admin: filete fino sobre papel, esquinas de
 * 12 px, título en peso y no en tamaño.
 */
export function FormSection({
  title,
  description,
  children,
  collapsible = true,
  defaultOpen = false,
  badge,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Una señal corta a la derecha del título: "3 seleccionados". */
  badge?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen || !collapsible);
  const bodyId = useId();

  const heading = (
    <div className="min-w-0 text-left">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description ? (
        <p className="mt-0.5 text-[0.9375rem] leading-relaxed text-ink-muted">
          {description}
        </p>
      ) : null}
    </div>
  );

  return (
    <section
      className={cn("rounded-xl border border-stone bg-paper px-5 py-5 sm:px-6", className)}
    >
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex w-full items-start justify-between gap-5"
        >
          {heading}
          <span className="flex shrink-0 items-center gap-3 pt-1">
            {badge ? (
              <span className="text-sm font-medium text-burgundy">{badge}</span>
            ) : null}
            <ChevronDown
              aria-hidden
              strokeWidth={1.4}
              className={cn(
                "size-5 text-ink-muted transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </span>
        </button>
      ) : (
        <div className="flex items-start justify-between gap-5">
          {heading}
          {badge ? (
            <span className="shrink-0 pt-1 text-sm font-medium text-burgundy">
              {badge}
            </span>
          ) : null}
        </div>
      )}

      {open ? (
        <div id={bodyId} className="mt-5">
          {children}
        </div>
      ) : null}
    </section>
  );
}
