import { Fuel, Gauge, Settings2, Timer, Waypoints, Zap } from "lucide-react";
import type { SpecRow } from "@/lib/vehicle-display";

/**
 * Lo que alguien mira antes de decidir si sigue leyendo.
 *
 * Los iconos son los mismos que la ficha usaba en su tabla de
 * especificaciones; se concentran aquí, donde una tira corta los aprovecha,
 * en vez de repetirse veinte veces en las tablas largas de abajo.
 *
 * El mapa va por etiqueta y no por posición porque las filas que llegan
 * dependen de lo que el vehículo tenga: un carro sin dato de torque no trae
 * esa fila, y la siguiente no debe heredar su icono.
 */
const icons: Record<string, React.ElementType> = {
  Potencia: Zap,
  "Potencia combinada": Zap,
  "Potencia total": Zap,
  Torque: Gauge,
  "0–100 km/h": Timer,
  Combustible: Fuel,
  Transmisión: Settings2,
  Tracción: Waypoints,
};

export function VehicleQuickFacts({ facts }: { facts: SpecRow[] }) {
  if (facts.length === 0) return null;

  return (
    <ul
      // Dos por fila en teléfono y hasta seis en escritorio: la tira se
      // reparte sola sin dejar una huérfana al final.
      className="grid grid-cols-2 border-t border-l border-stone sm:grid-cols-3 lg:grid-cols-6"
    >
      {facts.map(({ label, value }) => {
        const Icon = icons[label];
        return (
          <li
            key={label}
            className="border-r border-b border-stone px-4 py-4 sm:px-5 sm:py-5"
          >
            <p className="flex items-center gap-2 text-ink-muted">
              {Icon ? (
                <Icon aria-hidden strokeWidth={1.2} className="size-4" />
              ) : null}
              <span className="eyebrow">{label}</span>
            </p>
            <p className="mt-2 font-display text-[1.375rem] leading-none text-ink tabular">
              {value}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
