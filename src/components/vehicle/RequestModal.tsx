"use client";

import { useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { PrivacyNotice } from "@/components/forms/PrivacyNotice";
import { Button } from "@/components/ui/Button";
import { useDialog } from "@/components/ui/use-dialog";
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

  // Escape, bloqueo de scroll, foco dentro del diálogo, Tab que no se escapa
  // por detrás y foco devuelto al cerrar.
  useDialog(dialogRef, true, onClose);

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
      privacyConsent: data.get("privacyConsent") === "on",
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
        className="absolute inset-0 bg-dark/60"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-modal-title"
        className="viewer-in relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-cream sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-2">
          <div>
            <h2
              id="request-modal-title"
              className="text-[1.75rem] leading-tight text-ink"
            >
              {sent ? "Solicitud recibida" : text.title}
            </h2>
            <p className="mt-1.5 text-base text-ink-muted">
              {vehicleTitle(vehicle)} · {vehicle.year}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="press -mt-1 -mr-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-muted hover:bg-ink/6 hover:text-ink"
          >
            <X aria-hidden className="size-5" strokeWidth={1.25} />
          </button>
        </div>

        {sent ? (
          <div className="px-6 py-10 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-sand text-burgundy">
              <Check aria-hidden className="size-5" strokeWidth={1.5} />
            </span>
            <p className="mx-auto mt-6 max-w-sm text-[1.125rem] leading-relaxed text-ink-soft">
              Quedó registrada con los datos que nos dejaste. La estamos
              revisando.
            </p>
            <Button size="lg" className="mt-8" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4 px-6 py-6">
            <p className="text-[1.125rem] leading-relaxed text-ink-soft">
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
              error={fieldErrors.phone}
            />
            <Input
              label="Correo"
              name="correo"
              type="email"
              autoComplete="email"
              error={fieldErrors.email}
            />
            <p className="-mt-2 text-[0.9375rem] text-ink-muted">Indica al menos un teléfono o un correo para que podamos responderte.</p>
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

            <PrivacyNotice
              className="text-center"
              error={fieldErrors.privacyConsent}
            />

            <Button type="submit" size="lg" disabled={sending}>
              {sending ? "Enviando…" : text.cta}
            </Button>

            {error ? (
              <p role="alert" className="text-center text-sm text-burgundy">
                {error}
              </p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
