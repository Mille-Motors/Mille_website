"use client";

import { useState } from "react";
import { ArrowRight, Check, Lock } from "lucide-react";
import { Button, ButtonLink, ExternalButtonLink } from "@/components/ui/Button";
import { WhatsappIcon } from "@/components/ui/BrandIcons";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { contactWhatsappUrl } from "@/lib/whatsapp";
import { vehicleTitle } from "@/lib/format";
import type { Vehicle } from "@/types/vehicle";

type Status = "idle" | "sent";

/**
 * There is no backend: this form never persists anything, so it can't
 * honestly claim to have "sent" a message. Submitting builds a prefilled
 * WhatsApp link from the fields and opens it — the actual send happens there,
 * as the user's own action, not something the site can fake on their behalf.
 */
export function ContactForm({ vehicles }: { vehicles: Vehicle[] }) {
  const [status, setStatus] = useState<Status>("idle");
  const [waHref, setWaHref] = useState("");

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const vehicle = vehicles.find((v) => v.slug === data.get("vehiculo"));
    const href = contactWhatsappUrl({
      nombre: String(data.get("nombre") ?? ""),
      telefono: String(data.get("telefono") ?? ""),
      correo: String(data.get("correo") ?? ""),
      vehiculo: vehicle ? `${vehicleTitle(vehicle)} · ${vehicle.year}` : undefined,
      mensaje: String(data.get("mensaje") ?? ""),
    });
    setWaHref(href);
    window.open(href, "_blank", "noopener,noreferrer");
    setStatus("sent");
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
          Tu mensaje está listo.
        </h2>
        <p className="mx-auto mt-5 max-w-sm font-serif text-[1.0625rem] leading-relaxed text-ink-soft">
          Abrimos WhatsApp en una pestaña nueva con tu mensaje ya escrito.
          Solo confírmalo desde ahí para enviarlo.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <ExternalButtonLink href={waHref} size="lg">
            <WhatsappIcon className="size-4" />
            Abrir WhatsApp
          </ExternalButtonLink>
          <ButtonLink href="/" variant="outline" size="lg">
            Volver al inicio
          </ButtonLink>
        </div>
        <p className="eyebrow mt-12 leading-[1.9] text-ink-muted">
          Tu próximo vehículo
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
        Completa tus datos. Al enviarlo, abrimos WhatsApp con tu mensaje listo
        para confirmar.
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
          <option value="">Aún no lo tengo definido</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.slug}>
              {vehicleTitle(vehicle)} · {vehicle.year}
            </option>
          ))}
        </Select>
        <Textarea label="Mensaje" name="mensaje" rows={5} />

        <Button type="submit" size="lg" className="mt-1">
          Enviar mensaje
          <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
        </Button>

        <p className="flex items-center gap-2 text-xs text-ink-muted">
          <Lock aria-hidden className="size-3.5" strokeWidth={1.5} />
          Tu información está segura con nosotros.
        </p>
      </form>
    </div>
  );
}
