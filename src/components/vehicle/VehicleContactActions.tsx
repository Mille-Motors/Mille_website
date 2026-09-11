"use client";

import { useState } from "react";
import { CalendarDays, Mail } from "lucide-react";
import { Button, WhatsappButtonLink } from "@/components/ui/Button";
import { WhatsappIcon } from "@/components/ui/BrandIcons";
import { RequestModal } from "@/components/vehicle/RequestModal";
import { cn } from "@/lib/cn";
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
      <div className={cn("grid gap-3 sm:grid-cols-3", className)}>
        <WhatsappButtonLink href={vehicleWhatsappUrl(vehicle)} size="lg">
          <WhatsappIcon className="size-4" />
          Escribir por WhatsApp
        </WhatsappButtonLink>

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
