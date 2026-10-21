import type { Vehicle } from "@/types/vehicle";

/**
 * El carácter del vehículo: deportivo, de lujo, familiar…
 *
 * Es información y no un camino. Antes cada etiqueta llevaba al inventario ya
 * filtrado por ella, pero en plena ficha eso era una salida que nadie pidió:
 * quien lee sobre este vehículo no quiere que una palabra lo lleve a otra
 * página. Se ven, no se pulsan.
 */
export function VehicleTags({ vehicle }: { vehicle: Vehicle }) {
  if (vehicle.tags.length === 0) return null;

  return (
    <div>
      <p className="mb-3 text-[0.9375rem] text-ink-muted">Carácter</p>
      <ul className="flex flex-wrap items-center gap-2.5">
        {vehicle.tags.map((tag) => (
          <li
            key={tag}
            className="inline-flex h-9 items-center rounded-full border border-ink/15 bg-cream px-4 text-base text-ink-soft"
          >
            {tag}
          </li>
        ))}
      </ul>
    </div>
  );
}
