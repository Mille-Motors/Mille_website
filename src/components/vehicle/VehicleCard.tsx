import { objectPosition } from "@/lib/focal-point";
import { VEHICLE_FRAME_CLASS } from "@/lib/vehicle-frame";
import Image from "next/image";
import Link from "next/link";
import { RoundArrow } from "@/components/ui/Arrow";
import { badgeClass, badgeFor } from "@/components/vehicle/vehicle-badge";
import { cn } from "@/lib/cn";
import { formatCOP, formatMileage } from "@/lib/format";
import type { Vehicle } from "@/types/vehicle";

/** Sizes tell the image optimiser what widths a card actually renders at. */
const CARD_SIZES = "(min-width: 1024px) 28vw, (min-width: 640px) 44vw, 92vw";

/**
 * Una tarjeta del inventario: la fotografía manda, el texto la acompaña.
 *
 * Sin marco ni filetes: la fotografía tiene esquinas generosas y la
 * información va debajo, sobre el mismo fondo de la página. Toda la tarjeta
 * es el enlace —el título lleva el área clicable— y el foco se dibuja aquí
 * para que el teclado aterrice sobre la tarjeta entera.
 */
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
  const sold = vehicle.availability === "sold";
  const name = [vehicle.make, vehicle.model, vehicle.version]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className={cn(
        "group relative flex h-full w-full flex-col",
        "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-8 has-[a:focus-visible]:outline-burgundy",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-xl bg-sand",
          VEHICLE_FRAME_CLASS,
        )}
      >
        <Image
          src={cover.src}
          alt={cover.alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn(
            "object-cover transition-transform duration-900 ease-out-strong [@media(hover:hover)]:group-hover:scale-[1.04]",
            sold && "opacity-55 saturate-[0.45]",
          )}
          // El mismo encuadre que la ficha: la tarjeta usa esta misma
          // VehicleImage, y verla centrada aquí y desplazada allí sería
          // delatar que el encuadre es decorativo.
          style={{ objectPosition: objectPosition(cover.focal) }}
        />
        {badge ? (
          <span
            className={cn(
              "absolute top-3 left-3 rounded-full px-3.5 py-1.5 text-sm leading-none",
              badgeClass[badge.tone],
            )}
          >
            {badge.label}
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[clamp(1.375rem,0.8vw+1.15rem,1.75rem)] leading-[1.15] text-ink">
            <Link
              href={`/vehiculos/${vehicle.slug}`}
              className="after:absolute after:inset-0 focus-visible:outline-none"
            >
              {name}
            </Link>
          </h3>

          {/* Cada dato se une al anterior solo si existe: una card nunca
              escribe "· ·" ni un precio en cero. */}
          <p className="mt-1.5 text-base leading-snug text-ink-muted tabular">
            {[
              String(vehicle.year),
              vehicle.mileage === null ? null : formatMileage(vehicle.mileage),
              vehicle.fuelType,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {vehicle.price !== null ? (
            <p className="mt-3 text-[1.375rem] leading-none text-burgundy tabular">
              {formatCOP(vehicle.price)}
            </p>
          ) : null}
        </div>
        <RoundArrow className="mt-0.5" />
      </div>
    </article>
  );
}
