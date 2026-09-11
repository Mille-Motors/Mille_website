import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatCOP, formatMileage } from "@/lib/format";
import type { Vehicle } from "@/types/vehicle";

/** Sizes tell the image optimiser what widths a card actually renders at. */
const CARD_SIZES = "(min-width: 1024px) 31vw, (min-width: 640px) 46vw, 92vw";

/**
 * A badge only when it says something. Most cars carry none — if every card
 * has one, none of them mean anything.
 */
function badgeFor(vehicle: Vehicle) {
  if (vehicle.status === "sold") {
    return { label: "Vendido", className: "bg-ink/85 text-cream" };
  }
  if (vehicle.status === "reserved") {
    return { label: "Reservado", className: "bg-burgundy text-cream" };
  }
  if (vehicle.fuelType === "Eléctrico") {
    return { label: "Eléctrico", className: "bg-cream/92 text-ink" };
  }
  if (vehicle.fuelType.startsWith("Híbrido")) {
    return { label: "Híbrido", className: "bg-cream/92 text-ink" };
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
  const badge = badgeFor(vehicle);
  const cover = vehicle.images[0];
  const sold = vehicle.status === "sold";
  const name = [vehicle.model, vehicle.version].filter(Boolean).join(" ");

  return (
    <article
      className={cn(
        // Warm paper, not a dark slab: the card belongs to the page rather
        // than sitting on it. The whole thing is the link target, and the
        // focus ring is drawn here so the keyboard lands on the card.
        "group relative flex h-full w-full flex-col overflow-hidden border border-stone bg-paper",
        "transition-colors duration-300 hover:border-stone-strong",
        "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-burgundy",
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
            "object-cover transition-transform duration-[700ms] ease-out group-hover:scale-[1.015]",
            sold && "opacity-55 saturate-[0.45]",
          )}
        />
        {badge ? (
          <span
            className={cn(
              "label-caps absolute top-0 left-0 px-3 py-2 text-[10px]",
              badge.className,
            )}
          >
            {badge.label}
          </span>
        ) : null}
      </div>

      {/* Hairline that warms up on hover, in place of a heavy border. */}
      <span
        aria-hidden
        className="h-px w-full bg-burgundy/25 transition-colors duration-300 group-hover:bg-burgundy"
      />

      <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
        <p className="label-caps text-ink-muted">{vehicle.make}</p>

        <h3 className="mt-1.5 font-display text-[clamp(1.375rem,1.9vw,1.625rem)] leading-tight text-ink">
          <Link
            href={`/vehiculos/${vehicle.slug}`}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {name}
          </Link>
        </h3>

        <p className="mt-2 font-serif text-[0.9375rem] leading-snug text-ink-muted tabular">
          {vehicle.year} · {formatMileage(vehicle.mileage)} · {vehicle.fuelType}
        </p>

        <p className="mt-auto pt-4 font-display text-[1.5rem] leading-none text-burgundy tabular">
          {formatCOP(vehicle.price)}
        </p>
      </div>
    </article>
  );
}
