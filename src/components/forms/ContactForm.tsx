"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button, ButtonArrow } from "@/components/ui/Button";
import { PrivacyNotice } from "@/components/forms/PrivacyNotice";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { honeypotProps, submitInquiry } from "@/lib/inquiry-client";
import { vehicleTitle } from "@/lib/format";
import type { Vehicle } from "@/types/vehicle";

/**
 * Ahora existe backend, así que el envío es real: el mensaje se guarda en la
 * base y el éxito solo se muestra cuando el servidor confirma que la fila
 * quedó escrita. Si falla, se dice que falló.
 *
 * No se promete un canal que todavía no existe: MILLE no tiene WhatsApp ni
 * correo corporativo configurados, así que el copy no dice por dónde
 * responderemos, solo que el mensaje llegó.
 */
export function ContactForm({ vehicles }: { vehicles: Vehicle[] }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return; // Un doble clic no debe mandar dos solicitudes.

    const form = event.currentTarget;
    const data = new FormData(form);

    setSending(true);
    setError(null);
    setFieldErrors({});

    const vehiculo = String(data.get("vehiculo") ?? "");
    const result = await submitInquiry({
      type: vehiculo ? "vehicle_info" : "general",
      name: String(data.get("nombre") ?? ""),
      phone: String(data.get("telefono") ?? ""),
      email: String(data.get("correo") ?? ""),
      message: String(data.get("mensaje") ?? ""),
      vehicleSlug: vehiculo || undefined,
      source: "contacto",
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
    form.reset();
  }

  if (sent) {
    return (
      <div className="rounded-2xl bg-paper px-6 py-8 sm:px-10 sm:py-10">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-sand text-burgundy">
          <Check aria-hidden className="size-5" strokeWidth={1.5} />
        </span>
        <h2 className="text-heading mt-6">Recibimos tu mensaje.</h2>
        <p className="mt-3 max-w-md text-[1.125rem] leading-relaxed text-ink-soft">
          Quedó registrado y lo estamos revisando. Te contactamos con los datos
          que nos dejaste.
        </p>
        <Button
          variant="ghost"
          size="lg"
          className="mt-8"
          onClick={() => setSent(false)}
        >
          Enviar otro mensaje
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-paper px-6 py-8 sm:px-10 sm:py-10">
      <h2 className="text-heading">Envíanos un mensaje</h2>
      <p className="mt-3 text-[1.125rem] leading-relaxed text-ink-soft">
        Completa tus datos y cuéntanos qué estás buscando.
      </p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-5">
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
        <p className="-mt-3 text-[0.9375rem] text-ink-muted">Indica al menos un teléfono o un correo para que podamos responderte.</p>
        <Select label="Vehículo de interés" name="vehiculo" defaultValue="">
          <option value="">Aún no lo tengo definido</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.slug}>
              {vehicleTitle(vehicle)} · {vehicle.year}
            </option>
          ))}
        </Select>
        <Textarea
          label="Mensaje"
          name="mensaje"
          rows={5}
          error={fieldErrors.message}
        />

        {/* Trampa para bots: sin etiqueta y fuera de pantalla, una persona
            nunca la ve ni la tabula. */}
        <input name="website" {...honeypotProps} />

        <PrivacyNotice error={fieldErrors.privacyConsent} />

        <Button type="submit" size="lg" disabled={sending} className="mt-1 justify-between gap-8">
          {sending ? "Enviando…" : "Enviar mensaje"}
          {sending ? null : <ButtonArrow />}
        </Button>

        {error ? (
          <p role="alert" className="text-sm text-burgundy">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
