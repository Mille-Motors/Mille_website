"use client";

import { useState } from "react";
import { CalendarDays, Mail } from "lucide-react";
import { Button, WhatsappButtonLink } from "@/components/ui/Button";
import { WhatsappIcon } from "@/components/ui/BrandIcons";
import { RequestModal } from "@/components/vehicle/RequestModal";
import { cn } from "@/lib/cn";
import { site } from "@/data/site";
import { vehicleWhatsappUrl } from "@/lib/whatsapp";
import type { Vehicle } from "@/types/vehicle";

type Intent = "info" | "cita";

export function VehicleContactActions({
  vehicle,
  className,
}: {
  vehicle: Vehicle;
  className?: string;
}) {
  const [intent, setIntent] = useState<Intent | null>(null);

  return (
    <>
      {/* Anclaje para la barra fija de móvil, que sin WhatsApp trae aquí en
          vez de dejar un botón muerto. */}
      <div
        id="contactar"
        className={cn(
          "grid scroll-mt-24 gap-3",
          site.phone ? "sm:grid-cols-3" : "sm:grid-cols-2",
          className,
        )}
      >
        {site.phone ? (
          <WhatsappButtonLink href={vehicleWhatsappUrl(vehicle)} size="lg">
            <WhatsappIcon className="size-4" />
            Escribir por WhatsApp
          </WhatsappButtonLink>
        ) : null}

        <Button variant="outline" size="lg" onClick={() => setIntent("info")}>
          <Mail aria-hidden className="size-4" strokeWidth={1.5} />
          Solicitar información
        </Button>

        <Button variant="outline" size="lg" onClick={() => setIntent("cita")}>
          <CalendarDays aria-hidden className="size-4" strokeWidth={1.5} />
          Agendar cita
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
