import { VehicleFunFact } from "@/components/vehicle/VehicleFunFact";
import { VehicleTags } from "@/components/vehicle/VehicleTags";
import { cn } from "@/lib/cn";
import { descriptionParts } from "@/lib/vehicle-display";
import type { Vehicle } from "@/types/vehicle";

/**
 * «Acerca de este vehículo», lo que se cuenta de él.
 *
 * Es la primera tarjeta del menú de detalles, y se despliega como las demás.
 * Lo que cambia respecto a cuando era una sección suelta es cómo se reparte
 * el texto para que quepa en una tarjeta:
 *
 *   · el primer párrafo, si es corto, sube como entradilla y se lee más
 *     grande; el resto va en cuerpo normal;
 *   · el texto va a una medida de lectura, no a todo el ancho: una línea de
 *     ciento veinte caracteres no se lee, se recorre;
 *   · con escritorio, el carácter y el apunte editorial se apartan a una
 *     columna propia en vez de apilarse debajo y alargar la tarjeta. Sin
 *     ninguno de los dos, el texto ocupa solo su medida y no deja un hueco.
 */
export function VehicleAbout({ vehicle }: { vehicle: Vehicle }) {
  const { lead, body } = descriptionParts(vehicle.description);
  const funFactVisible =
    vehicle.funFact.enabled && Boolean(vehicle.funFact.body?.trim());
  const hasAside = vehicle.tags.length > 0 || funFactVisible;

  return (
    <div
      className={cn(
        "grid gap-8",
        hasAside && "lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-12",
      )}
    >
      {/* `whitespace-pre-line` conserva los saltos de línea que se escribieron
          en el admin dentro de un mismo párrafo. */}
      <div className="max-w-[64ch] space-y-5">
        {lead ? (
          <p className="text-[clamp(1.25rem,0.5vw+1.1rem,1.5rem)] leading-normal whitespace-pre-line text-ink">
            {lead}
          </p>
        ) : null}
        {body.map((paragraph, index) => (
          <p
            key={index}
            className="text-[1.1875rem] leading-[1.7] whitespace-pre-line text-ink-soft"
          >
            {paragraph}
          </p>
        ))}
      </div>

      {hasAside ? (
        <div className="grid content-start gap-7">
          <VehicleTags vehicle={vehicle} />
          {funFactVisible ? <VehicleFunFact funFact={vehicle.funFact} /> : null}
        </div>
      ) : null}
    </div>
  );
}
