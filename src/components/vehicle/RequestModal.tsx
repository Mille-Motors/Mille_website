"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { vehicleTitle } from "@/lib/format";
import type { Vehicle } from "@/types/vehicle";

const copy = {
  info: {
    title: "Solicitar información",
    intro: "Cuéntanos qué necesitas saber.",
    cta: "Enviar solicitud",
  },
  cita: {
    title: "Agendar cita",
    intro:
      "Déjanos tus datos y coordinamos una visita para que lo veas en persona.",
    cta: "Solicitar cita",
  },
} as const;

/**
 * There is no backend and no provisioned contact channel yet, so this can't
 * submit or claim to submit anything. Fields and validation stay in place —
 * the form is ready — but the CTA is disabled with a plain, discrete note
 * instead of a fake success state.
 */
export function RequestModal({
  vehicle,
  intent,
  onClose,
}: {
  vehicle: Vehicle;
  intent: keyof typeof copy;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const text = copy[intent];

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-modal-title"
        className="relative max-h-[92dvh] w-full overflow-y-auto border border-stone bg-cream sm:max-w-lg"
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone px-6 py-5">
          <div>
            <h2
              id="request-modal-title"
              className="font-display text-2xl leading-tight text-ink"
            >
              {text.title}
            </h2>
            <p className="mt-1.5 font-serif text-sm text-ink-muted">
              {vehicleTitle(vehicle)} · {vehicle.year}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mt-1 -mr-2 inline-flex size-10 shrink-0 items-center justify-center text-ink-muted transition-colors hover:text-ink"
          >
            <X aria-hidden className="size-5" strokeWidth={1.25} />
          </button>
        </div>

        <form
          onSubmit={(event) => event.preventDefault()}
          className="grid gap-4 px-6 py-6"
        >
          <p className="font-serif text-[0.9375rem] leading-relaxed text-ink-soft">
            {text.intro}
          </p>
          <Input label="Nombre" name="nombre" autoComplete="name" required />
          <Input
            label="Teléfono"
            name="telefono"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
          />
          <Input
            label="Correo"
            name="correo"
            type="email"
            autoComplete="email"
            required
          />
          <Textarea
            label="Mensaje"
            name="mensaje"
            rows={3}
            defaultValue={
              intent === "cita"
                ? `Quisiera agendar una cita para ver el ${vehicleTitle(vehicle)}.`
                : ""
            }
          />
          <Button type="submit" size="lg" disabled>
            {text.cta}
          </Button>
          <p className="text-center text-xs text-ink-muted">
            Envío habilitado al lanzamiento.
          </p>
        </form>
      </div>
    </div>
  );
}
