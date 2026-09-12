"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { honeypotProps, submitInquiry } from "@/lib/inquiry-client";
import { vehicleTitle } from "@/lib/format";
import type { Vehicle } from "@/types/vehicle";

const copy = {
  info: {
    title: "Solicitar información",
    intro: "Cuéntanos qué necesitas saber.",
    cta: "Enviar solicitud",
    type: "vehicle_info",
  },
  cita: {
    title: "Agendar cita",
    intro:
      "Déjanos tus datos y coordinamos una visita para que lo veas en persona.",
    cta: "Solicitar cita",
    type: "appointment",
  },
} as const;

/**
 * El envío es real: guarda una solicitud asociada al vehículo y solo dice
 * que la recibimos cuando la base lo confirma. El copy no promete un canal
 * de respuesta concreto porque MILLE todavía no tiene ninguno configurado.
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
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    const data = new FormData(event.currentTarget);

    setSending(true);
    setError(null);
    setFieldErrors({});

    const result = await submitInquiry({
      type: text.type,
      name: String(data.get("nombre") ?? ""),
      phone: String(data.get("telefono") ?? ""),
      email: String(data.get("correo") ?? ""),
      message: String(data.get("mensaje") ?? ""),
      vehicleSlug: vehicle.slug,
      source: `vehiculo:${vehicle.slug}`,
      website: String(data.get("website") ?? ""),
    });

    setSending(false);

    if (!result.ok) {
      setError(result.message);
      setFieldErrors(result.fields ?? {});
      return;
    }

    setSent(true);
  }

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
              {sent ? "Solicitud recibida" : text.title}
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

        {sent ? (
          <div className="px-6 py-10 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-sand text-burgundy">
              <Check aria-hidden className="size-5" strokeWidth={1.5} />
            </span>
            <p className="mx-auto mt-6 max-w-sm font-serif text-[0.9375rem] leading-relaxed text-ink-soft">
              Quedó registrada con los datos que nos dejaste. La estamos
              revisando.
            </p>
            <Button size="lg" className="mt-8" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4 px-6 py-6">
            <p className="font-serif text-[0.9375rem] leading-relaxed text-ink-soft">
              {text.intro}
            </p>
            <Input
              label="Nombre"
              name="nombre"
              autoComplete="name"
              required
              error={fieldErrors.name}
            />
            <Input
              label="Teléfono"
              name="telefono"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              error={fieldErrors.phone}
            />
            <Input
              label="Correo"
              name="correo"
              type="email"
              autoComplete="email"
              required
              error={fieldErrors.email}
            />
            <Textarea
              label="Mensaje"
              name="mensaje"
              rows={3}
              error={fieldErrors.message}
              defaultValue={
                intent === "cita"
                  ? `Quisiera agendar una cita para ver el ${vehicleTitle(vehicle)}.`
                  : ""
              }
            />

            <input name="website" {...honeypotProps} />

            <Button type="submit" size="lg" disabled={sending}>
              {sending ? "Enviando…" : text.cta}
            </Button>

            {error ? (
              <p role="alert" className="text-center text-xs text-burgundy">
                {error}
              </p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
