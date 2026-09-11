import {
  Calendar,
  Cog,
  Fuel,
  Gauge,
  MapPin,
  Palette,
  Settings2,
  Sofa,
  Zap,
} from "lucide-react";
import { formatMileage } from "@/lib/format";
import type { Vehicle } from "@/types/vehicle";

type Row = { icon: React.ElementType; label: string; value: string };

export function specRows(vehicle: Vehicle): Row[] {
  return [
    { icon: Calendar, label: "Año", value: String(vehicle.year) },
    { icon: Gauge, label: "Kilometraje", value: formatMileage(vehicle.mileage) },
    { icon: Cog, label: "Motor", value: vehicle.engine },
    { icon: Zap, label: "Potencia", value: vehicle.power },
    { icon: Fuel, label: "Combustible", value: vehicle.fuelType },
    { icon: Settings2, label: "Transmisión", value: vehicle.transmission },
    { icon: Settings2, label: "Tracción", value: vehicle.drivetrain },
    { icon: Palette, label: "Color exterior", value: vehicle.exteriorColor },
    { icon: Sofa, label: "Color interior", value: vehicle.interiorColor },
    { icon: MapPin, label: "Ciudad", value: vehicle.city },
  ];
}

export function VehicleSpecs({
  vehicle,
  rows,
}: {
  vehicle: Vehicle;
  /** Optional subset, used for the condensed mobile summary. */
  rows?: Row[];
}) {
  const items = rows ?? specRows(vehicle);

  return (
    <dl className="divide-y divide-stone border-t border-stone">
      {items.map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1.1fr)] items-center gap-x-4 py-3.5"
        >
          <Icon
            aria-hidden
            strokeWidth={1.2}
            className="size-[1.125rem] text-ink-muted"
          />
          <dt className="font-serif text-[0.9375rem] text-ink-muted">{label}</dt>
          <dd className="font-serif text-[0.9375rem] text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
