import {
  Fuel,
  Gauge,
  Hash,
  MapPin,
  Settings2,
  Timer,
  Waypoints,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { SpecRow } from "@/lib/vehicle-display";

/**
 * Lo que alguien mira antes de decidir si sigue leyendo: cifras grandes con
 * su nombre debajo, en dos columnas, sobre el fondo oscuro del resumen.
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
  "Placa termina en": Hash,
  "Matriculado en": MapPin,
};

export function VehicleQuickFacts({
  facts,
  className,
}: {
  facts: SpecRow[];
  className?: string;
}) {
  if (facts.length === 0) return null;

  return (
    <dl className={cn("grid grid-cols-2 gap-x-6 gap-y-8", className)}>
      {facts.map(({ label, value }) => {
        const Icon = icons[label];
        return (
          <div key={label}>
            <dt className="flex items-center gap-2 text-[0.9375rem] text-cream/60">
              {Icon ? (
                <Icon aria-hidden strokeWidth={1.3} className="size-4" />
              ) : null}
              {label}
            </dt>
            <dd className="mt-2 text-[clamp(1.375rem,0.9vw+1.05rem,1.875rem)] leading-[1.1] tabular">
              {value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
