import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { formatCOP, formatMileage, vehicleTitle } from "@/lib/format";
import { statusLabel } from "@/lib/vehicle-status";
import type { Vehicle } from "@/types/vehicle";

/** Sizes tell the image optimiser what widths a card actually renders at. */
const CARD_SIZES =
  "(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 88vw";

function badgeFor(vehicle: Vehicle) {
  if (vehicle.status === "sold" || vehicle.status === "reserved") {
    return { label: statusLabel(vehicle.status), tone: "dark" as const };
  }
  if (vehicle.fuelType.startsWith("Híbrido")) {
    return { label: "Híbrido", tone: "light" as const };
  }
  if (vehicle.fuelType === "Eléctrico") {
    return { label: "Eléctrico", tone: "light" as const };
  }
  if (vehicle.featured) {
    return { label: "Destacado", tone: "burgundy" as const };
  }
  return null;
}

export function VehicleCard({
  vehicle,
  priority,
  className,
  sizes = CARD_SIZES,
}: {
  vehicle: Vehicle;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  const title = vehicleTitle(vehicle);
  const badge = badgeFor(vehicle);
  const cover = vehicle.images[0];
  const dimmed = vehicle.status === "sold";

  return (
    <article
      className={cn(
        "group relative flex h-full w-full flex-col border border-stone bg-paper transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-stone-strong hover:shadow-subtle",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-sand">
        <Image
          src={cover.src}
          alt={cover.alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn(
            "object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.02]",
            dimmed && "opacity-70 saturate-[0.6]",
          )}
        />
        {badge ? (
          <Badge tone={badge.tone} className="absolute top-0 right-0">
            {badge.label}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col px-5 pt-5 pb-5">
        <h3 className="font-display text-[1.3125rem] leading-tight text-ink">
          <Link href={`/vehiculos/${vehicle.slug}`} className="after:absolute after:inset-0">
            {title}
          </Link>
        </h3>

        <p className="mt-2.5 flex items-center gap-2.5 font-serif text-[0.9375rem] text-ink-muted tabular">
          <span>{vehicle.year}</span>
          <span aria-hidden className="h-3 w-px bg-stone-strong" />
          <span>{formatMileage(vehicle.mileage)}</span>
        </p>

        <div className="mt-auto flex items-end justify-between gap-4 pt-5">
          <p className="font-display text-[1.375rem] leading-none text-ink tabular">
            {formatCOP(vehicle.price)}
          </p>
          <ArrowRight
            aria-hidden
            strokeWidth={1.25}
            className="size-5 shrink-0 text-ink-muted transition-[transform,color] duration-300 group-hover:translate-x-1 group-hover:text-burgundy"
          />
        </div>
      </div>
    </article>
  );
}
