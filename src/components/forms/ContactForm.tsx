"use client";

import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { vehicleTitle } from "@/lib/format";
import type { Vehicle } from "@/types/vehicle";

/**
 * There is no backend and no provisioned contact channel yet, so this can't
 * submit or claim to submit anything. Fields and validation stay in place —
 * the form is ready — but the CTA is disabled with a plain, discrete note
 * instead of a fake success state.
 */
export function ContactForm({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <div className="border border-stone bg-paper px-6 py-8 sm:px-10 sm:py-10">
      <h2 className="font-display text-[1.75rem] leading-tight text-ink">
        Envíanos un mensaje
      </h2>
      <p className="mt-3 font-serif text-[0.9375rem] leading-relaxed text-ink-soft">
        Completa tus datos. El envío se habilita cuando el canal de contacto
        esté disponible.
      </p>

      <form
        onSubmit={(event) => event.preventDefault()}
        className="mt-8 grid gap-5"
      >
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

        <Button type="submit" size="lg" disabled className="mt-1">
          Enviar mensaje
          <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
        </Button>

        <p className="flex items-center gap-2 text-xs text-ink-muted">
          <Lock aria-hidden className="size-3.5" strokeWidth={1.5} />
          Envío habilitado al lanzamiento.
        </p>
      </form>
    </div>
  );
}
