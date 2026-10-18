import { ButtonLink, WhatsappButtonLink } from "@/components/ui/Button";
import { WhatsappIcon } from "@/components/ui/BrandIcons";
import { site } from "@/data/site";
import { formatCOP } from "@/lib/format";
import { vehicleWhatsappUrl } from "@/lib/whatsapp";
import type { Vehicle } from "@/types/vehicle";

/**
 * Barra fija de teléfono. El precio se queda visible junto a la acción
 * principal. Sólida y sin transparencias: debajo pasan fotografías y texto,
 * y un velo borroso las dejaría leerse a medias.
 *
 * Mientras no exista línea de WhatsApp, esa acción no puede ser un botón
 * inerte: es el único CTA de la ficha en móvil. Lleva a las acciones de
 * contacto del propio vehículo, que sí funcionan —solicitar información y
 * agendar cita—. Cuando `site.phone` tenga valor, vuelve el WhatsApp.
 */
export function StickyWhatsapp({ vehicle }: { vehicle: Vehicle }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-cream px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="flex items-center gap-4">
        {/* Un publicado siempre tiene precio; si faltara, la barra se queda
            sin la cifra en vez de anunciar "$ 0". */}
        {vehicle.price !== null ? (
          <p className="min-w-0 shrink text-[1.375rem] leading-none text-ink tabular">
            {formatCOP(vehicle.price)}
          </p>
        ) : null}
        {site.phone ? (
          <WhatsappButtonLink
            href={vehicleWhatsappUrl(vehicle)}
            size="md"
            className="ml-auto flex-1 justify-center"
            data-wa-source="vehicle-bar"
            data-wa-intent="vehiculo"
            data-wa-slug={vehicle.slug}
          >
            <WhatsappIcon className="size-5" />
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
