import { VehicleCard } from "@/components/vehicle/VehicleCard";
import { cn } from "@/lib/cn";
import type { Vehicle } from "@/types/vehicle";
import { REVEAL } from "@/lib/reveal";

/**
 * Three columns at most, on purpose: the point of the inventory is to look
 * at the vehicles, and a fourth column makes every one of them smaller.
 *
 * Las tarjetas llegan de una en una al entrar en pantalla, con un retraso
 * que se repite por fila: así una rejilla larga no se enciende de golpe.
 */
export function VehicleGrid({
  vehicles,
  className,
  priorityCount = 0,
}: {
  vehicles: Vehicle[];
  className?: string;
  /** How many cards load eagerly. Only above-the-fold ones should. */
  priorityCount?: number;
}) {
  return (
    <ul
      className={cn(
        "grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16",
        className,
      )}
    >
      {vehicles.map((vehicle, index) => (
        <li
          key={vehicle.id}
          className="flex"
          {...REVEAL}
          style={{ "--d": `${(index % 3) * 90}ms` } as React.CSSProperties}
        >
          <VehicleCard vehicle={vehicle} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
