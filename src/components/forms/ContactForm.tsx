"use client";

import { useState } from "react";
import { ArrowRight, Check, Lock } from "lucide-react";
import { Button, ButtonLink, ExternalButtonLink } from "@/components/ui/Button";
import { WhatsappIcon } from "@/components/ui/BrandIcons";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { generalWhatsappUrl } from "@/lib/whatsapp";
import { vehicleTitle } from "@/lib/format";
import type { Vehicle } from "@/types/vehicle";

type Status = "idle" | "sending" | "sent";

/**
 * Front-end only for now. `submit` simulates the round trip; wiring this to a
 * server action later means replacing the body of `submit` and nothing else.
 */
export function ContactForm({ vehicles }: { vehicles: Vehicle[] }) {
  const [status, setStatus] = useState<Status>("idle");

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");
    window.setTimeout(() => setStatus("sent"), 800);
  };

  if (status === "sent") {
    return (
      <div className="border border-stone bg-paper px-6 py-16 text-center sm:px-12">
        <span className="mx-auto inline-flex size-16 items-center justify-center rounded-full border border-burgundy/30 text-burgundy">
          <Check aria-hidden className="size-8" strokeWidth={1.1} />
        </span>
        <h2 className="mt-8 font-display text-[clamp(1.75rem,3.6vw,2.375rem)] leading-[1.15] text-ink uppercase">
          Gracias.
          <br />
          Recibimos tu mensaje.
        </h2>
        <p className="mx-auto mt-5 max-w-sm font-serif text-[1.0625rem] leading-relaxed text-ink-soft">
          Uno de nuestros asesores se pondrá en contacto contigo muy pronto.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/" size="lg">
            Volver al inicio
          </ButtonLink>
          <ExternalButtonLink
            href={generalWhatsappUrl()}
            variant="outline"
            size="lg"
          >
            <WhatsappIcon className="size-4" />
            WhatsApp
          </ExternalButtonLink>
        </div>
        <p className="eyebrow mt-12 leading-[1.9] text-ink-muted">
          Tu próximo auto extraordinario
          <br />
          está más cerca
        </p>
      </div>
    );
  }

  return (
    <div className="border border-stone bg-paper px-6 py-8 sm:px-10 sm:py-10">
      <h2 className="font-display text-[1.75rem] leading-tight text-ink">
        Envíanos un mensaje
      </h2>
      <p className="mt-3 font-serif text-[0.9375rem] leading-relaxed text-ink-soft">
        Completa el formulario y uno de nuestros asesores se pondrá en contacto
        contigo.
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-5">
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
        <Select label="Vehículo de interés" name="vehiculo" defaultValue="">
          <option value="">Sin definir</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.slug}>
              {vehicleTitle(vehicle)} · {vehicle.year}
            </option>
          ))}
        </Select>
        <Textarea label="Mensaje" name="mensaje" rows={5} />

        <Button type="submit" size="lg" disabled={status === "sending"} className="mt-1">
          {status === "sending" ? "Enviando…" : "Enviar mensaje"}
          {status === "sending" ? null : (
            <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
          )}
        </Button>

        <p className="flex items-center gap-2 text-xs text-ink-muted">
          <Lock aria-hidden className="size-3.5" strokeWidth={1.5} />
          Tu información está segura con nosotros.
        </p>
      </form>
    </div>
  );
}
