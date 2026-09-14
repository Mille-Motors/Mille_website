import { ButtonLink, WhatsappButtonLink } from "@/components/ui/Button";
import { WhatsappIcon } from "@/components/ui/BrandIcons";
import { site } from "@/data/site";
import { formatCOP } from "@/lib/format";
import { vehicleWhatsappUrl } from "@/lib/whatsapp";
import type { Vehicle } from "@/types/vehicle";

/**
 * Barra fija de teléfono. El precio se queda visible junto a la acción
 * principal.
 *
 * Mientras no exista línea de WhatsApp, esa acción no puede ser un botón
 * inerte: es el único CTA de la ficha en móvil. Lleva a las acciones de
 * contacto del propio vehículo, que sí funcionan —solicitar información y
 * agendar cita—. Cuando `site.phone` tenga valor, vuelve el WhatsApp.
 */
export function StickyWhatsapp({ vehicle }: { vehicle: Vehicle }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone bg-cream/97 px-4 py-3 backdrop-blur-[6px] lg:hidden">
      <div className="flex items-center gap-4">
        <p className="min-w-0 shrink font-display text-lg leading-none text-ink tabular">
          {formatCOP(vehicle.price)}
        </p>
        {site.phone ? (
          <WhatsappButtonLink
            href={vehicleWhatsappUrl(vehicle)}
            size="md"
            className="ml-auto flex-1 justify-center"
          >
            <WhatsappIcon className="size-4" />
            WhatsApp
          </WhatsappButtonLink>
        ) : (
          <ButtonLink
            href="#contactar"
            size="md"
            className="ml-auto flex-1 justify-center"
          >
            Contactar
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
