import Link from "next/link";
import { inventoryHref } from "@/lib/filters";
import type { Vehicle } from "@/types/vehicle";

/**
 * El carácter del vehículo, y cada etiqueta es un camino: pulsarla lleva al
 * inventario ya filtrado por ella. Son enlaces y no adornos porque quien
 * reconoce "Off-road" en una Land Cruiser probablemente quiera ver las otras.
 */
export function VehicleTags({ vehicle }: { vehicle: Vehicle }) {
  if (vehicle.tags.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center gap-2.5">
      {vehicle.tags.map((tag) => (
        <li key={tag}>
          <Link
            href={inventoryHref({ tipo: vehicle.vehicleType, etiqueta: tag })}
            className="press inline-flex min-h-10 items-center rounded-full border border-ink/25 px-4 text-base text-ink-soft hover:border-burgundy hover:text-burgundy"
          >
            {tag}
          </Link>
        </li>
      ))}
    </ul>
  );
}
