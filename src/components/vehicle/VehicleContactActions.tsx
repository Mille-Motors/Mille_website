"use client";

import { useState } from "react";
import { CalendarDays, Check, Mail } from "lucide-react";
import { Button, ExternalButtonLink } from "@/components/ui/Button";
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
  const [sent, setSent] = useState<Intent | null>(null);

  return (
    <>
      <div className={cn("grid gap-3 sm:grid-cols-3", className)}>
        <ExternalButtonLink href={vehicleWhatsappUrl(vehicle)} size="lg">
          <WhatsappIcon className="size-4" />
          Escribir por WhatsApp
        </ExternalButtonLink>

        <Button variant="outline" size="lg" onClick={() => setIntent("info")}>
          {sent === "info" ? (
            <Check aria-hidden className="size-4" strokeWidth={1.5} />
          ) : (
            <Mail aria-hidden className="size-4" strokeWidth={1.5} />
          )}
          Solicitar información
        </Button>

        <Button variant="outline" size="lg" onClick={() => setIntent("cita")}>
          {sent === "cita" ? (
            <Check aria-hidden className="size-4" strokeWidth={1.5} />
          ) : (
            <CalendarDays aria-hidden className="size-4" strokeWidth={1.5} />
          )}
          Agendar cita
        </Button>
      </div>

      {intent ? (
        <RequestModal
          vehicle={vehicle}
          intent={intent}
          onClose={() => setIntent(null)}
          onSent={() => setSent(intent)}
        />
      ) : null}
    </>
  );
}
