import { VehicleCard } from "@/components/vehicle/VehicleCard";
import { cn } from "@/lib/cn";
import type { Vehicle } from "@/types/vehicle";

/**
 * Three columns at most, on purpose: the point of the inventory is to look
 * at the vehicles, and a fourth column makes every one of them smaller.
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
        "grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-7 lg:gap-y-14",
        className,
      )}
    >
      {vehicles.map((vehicle, index) => (
        <li key={vehicle.id} className="flex">
          <VehicleCard vehicle={vehicle} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
