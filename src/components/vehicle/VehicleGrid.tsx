import { VehicleCard } from "@/components/vehicle/VehicleCard";
import { cn } from "@/lib/cn";
import type { Vehicle } from "@/types/vehicle";

export function VehicleGrid({
  vehicles,
  className,
  columns = 3,
  priorityCount = 0,
}: {
  vehicles: Vehicle[];
  className?: string;
  columns?: 3 | 4;
  /** How many cards load eagerly. Only above-the-fold ones should. */
  priorityCount?: number;
}) {
  return (
    <ul
      className={cn(
        "grid gap-x-5 gap-y-9 sm:grid-cols-2",
        columns === 4 ? "xl:grid-cols-4 lg:grid-cols-3" : "lg:grid-cols-3",
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
