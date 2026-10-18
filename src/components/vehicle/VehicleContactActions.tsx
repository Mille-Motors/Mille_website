"use client";

import { useState } from "react";
import { CalendarDays, Mail } from "lucide-react";
import { Button, ButtonArrow, WhatsappButtonLink } from "@/components/ui/Button";
import { WhatsappIcon } from "@/components/ui/BrandIcons";
import { RequestModal } from "@/components/vehicle/RequestModal";
import { cn } from "@/lib/cn";
import { site } from "@/data/site";
import { vehicleWhatsappUrl } from "@/lib/whatsapp";
import type { Vehicle } from "@/types/vehicle";

type Intent = "info" | "cita";

/**
 * Las tres maneras de preguntar por un vehículo: WhatsApp con el mensaje ya
 * escrito, solicitar información y agendar una cita.
 *
 * Aparece dos veces en la ficha. En el resumen oscuro, apilada junto al
 * precio (`summary`), y como cierre vinotinto al final (`closing`), que es el
 * ancla de la barra fija del teléfono. Cada una lleva su propio estado de
 * diálogo; las dos abren el mismo formulario.
 */
export function VehicleContactActions({
  vehicle,
  variant = "closing",
  className,
}: {
  vehicle: Vehicle;
  variant?: "summary" | "closing";
  className?: string;
}) {
  const [intent, setIntent] = useState<Intent | null>(null);
  const closing = variant === "closing";

  return (
    <>
      <div
        // Anclaje para la barra fija de móvil, que sin WhatsApp trae aquí en
        // vez de dejar un botón muerto.
        id={closing ? "contactar" : undefined}
        className={cn(
          "grid gap-3",
          closing && "scroll-mt-header sm:grid-cols-3",
          className,
        )}
      >
        {site.phone ? (
          <WhatsappButtonLink
            href={vehicleWhatsappUrl(vehicle)}
            variant="cream"
            size="lg"
            className="justify-between gap-6"
            data-wa-source="vehicle-page"
            data-wa-intent="vehiculo"
            data-wa-slug={vehicle.slug}
          >
            <span className="inline-flex items-center gap-3">
              <WhatsappIcon className="size-5" />
              Escribir por WhatsApp
            </span>
            <ButtonArrow />
          </WhatsappButtonLink>
        ) : null}

        <Button
          variant="onDark"
          size="lg"
          className="justify-between gap-6"
          onClick={() => setIntent("info")}
        >
          <span className="inline-flex items-center gap-3">
            <Mail aria-hidden className="size-5" strokeWidth={1.4} />
            Solicitar información
          </span>
          <ButtonArrow />
        </Button>

        <Button
          variant="onDark"
          size="lg"
          className="justify-between gap-6"
          onClick={() => setIntent("cita")}
        >
          <span className="inline-flex items-center gap-3">
            <CalendarDays aria-hidden className="size-5" strokeWidth={1.4} />
            Agendar cita
          </span>
          <ButtonArrow />
        </Button>
      </div>

      {intent ? (
        <RequestModal
          vehicle={vehicle}
          intent={intent}
          onClose={() => setIntent(null)}
        />
      ) : null}
    </>
  );
}
