import { WhatsappButtonLink } from "@/components/ui/Button";
import { WhatsappIcon } from "@/components/ui/BrandIcons";
import { formatCOP } from "@/lib/format";
import { vehicleWhatsappUrl } from "@/lib/whatsapp";
import type { Vehicle } from "@/types/vehicle";

/** Phone-only bar. Price stays visible next to the primary action. */
export function StickyWhatsapp({ vehicle }: { vehicle: Vehicle }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone bg-cream/97 px-4 py-3 backdrop-blur-[6px] lg:hidden">
      <div className="flex items-center gap-4">
        <p className="min-w-0 shrink font-display text-lg leading-none text-ink tabular">
          {formatCOP(vehicle.price)}
        </p>
        <WhatsappButtonLink
          href={vehicleWhatsappUrl(vehicle)}
          size="md"
          className="ml-auto flex-1 justify-center"
        >
          <WhatsappIcon className="size-4" />
          WhatsApp
        </WhatsappButtonLink>
      </div>
    </div>
  );
}
