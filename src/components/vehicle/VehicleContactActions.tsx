import { CalendarDays } from "lucide-react";
import { ButtonArrow, WhatsappButtonLink } from "@/components/ui/Button";
import { WhatsappIcon } from "@/components/ui/BrandIcons";
import { cn } from "@/lib/cn";
import { site } from "@/data/site";
import { vehicleVisitWhatsappUrl, vehicleWhatsappUrl } from "@/lib/whatsapp";
import type { Vehicle } from "@/types/vehicle";

/**
 * Cómo se contacta a MILLE por un vehículo: por WhatsApp, y solo por
 * WhatsApp.
 *
 * Antes había tres salidas —WhatsApp, «Solicitar información» y «Agendar
 * cita»—, y las dos últimas abrían un formulario cuyas solicitudes alguien
 * tenía que leer en otro sitio. El canal oficial es uno, y el sitio no recibe
 * ni citas ni solicitudes de un vehículo concreto: quien quiere información o
 * una visita escribe por WhatsApp, con el mensaje ya redactado, y lo demás lo
 * resuelve la conversación.
 *
 * Aparece dos veces en la ficha. En el resumen oscuro, junto al precio
 * (`summary`): una sola acción. Y como cierre vinotinto al final (`closing`),
 * que es el ancla de la barra fija del teléfono: preguntar, o pedir una
 * visita; las dos son WhatsApp.
 *
 * Es un componente de servidor: no hay estado ni diálogo que mantener. El
 * conteo de clics lo recoge el rastreador global por los `data-wa-*`.
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
  const closing = variant === "closing";
  const askHref = vehicleWhatsappUrl(vehicle);
  const visitHref = vehicleVisitWhatsappUrl(vehicle);

  return (
    <div
      // Anclaje para la barra fija de móvil, que sin WhatsApp trae aquí en
      // vez de dejar un botón muerto.
      id={closing ? "contactar" : undefined}
      className={cn(
        "grid gap-3",
        closing && "sm:grid-cols-2 lg:max-w-3xl",
        className,
      )}
    >
      <WhatsappButtonLink
        href={askHref}
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

      {/* Sin línea no hay segundo botón que mostrar: los dos dirían «WhatsApp
          próximamente» y uno basta. */}
      {closing && site.phone ? (
        <WhatsappButtonLink
          href={visitHref}
          variant="onDark"
          size="lg"
          className="justify-between gap-6"
          data-wa-source="vehicle-page"
          data-wa-intent="cita"
          data-wa-slug={vehicle.slug}
        >
          <span className="inline-flex items-center gap-3">
            <CalendarDays aria-hidden className="size-5" strokeWidth={1.4} />
            Agendar una visita
          </span>
          <ButtonArrow />
        </WhatsappButtonLink>
      ) : null}
    </div>
  );
}
