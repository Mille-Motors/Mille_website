import Link from "next/link";
import { TextLink } from "@/components/ui/Arrow";
import { CategorySketch } from "@/components/vehicle/sketch";
import { wheelsLabel } from "@/lib/categories";
import { inventoryHref } from "@/lib/filters";
import { VEHICLE_TYPES, type VehicleCategory } from "@/types/vehicle";

/**
 * La banda ya con sus categorías. Aparte para poder dibujarla —y comprobarla—
 * sin base de datos.
 *
 * Una fila por universo —«4 ruedas» y «2 ruedas»—, cada una con su título y su
 * atajo a todo el universo. Con siete categorías por universo, desde pantalla
 * ancha caben las siete en una sola línea; en tablet bajan a cuatro por fila y
 * en teléfono a dos. Las tarjetas son pequeñas a propósito: el dibujo ocupa
 * todo su ancho y basta para reconocer la carrocería.
 */
export function CategoryTiles({
  categories,
  className,
}: {
  categories: VehicleCategory[];
  className?: string;
}) {
  const groups = VEHICLE_TYPES.map((type) => ({
    type,
    items: categories.filter((category) => category.vehicleType === type),
  })).filter((group) => group.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <nav aria-label="Explorar por tipo" className={className}>
      <div className="grid gap-[clamp(2rem,4vw,3rem)]">
        {groups.map((group) => (
          <section key={group.type} aria-label={wheelsLabel[group.type]}>
            <div className="mb-4 flex items-center justify-between gap-6">
              <h3 className="text-[1.375rem] leading-none text-cream">
                {wheelsLabel[group.type]}
              </h3>
              <TextLink
                href={inventoryHref({ tipo: group.type })}
                className="min-h-10 gap-3 text-base text-cream/70 hover:text-cream"
              >
                Ver todos
                <span className="sr-only"> los vehículos de {wheelsLabel[group.type]}</span>
              </TextLink>
            </div>

            <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
              {group.items.map((category) => (
                <li key={category.id}>
                  <Link
                    href={inventoryHref({ tipo: category.vehicleType, categoria: category.slug })}
                    className="group flex h-full min-h-28 flex-col items-start justify-between gap-3 rounded-xl bg-cream/5 p-3.5 transition-colors duration-300 hover:bg-cream/10 sm:p-4"
                  >
                    <CategorySketch
                      slug={category.slug}
                      vehicleType={category.vehicleType}
                      className="h-auto w-full text-burgundy-light transition-transform duration-500 ease-out-strong group-hover:translate-x-1"
                    />
                    <span className="text-base leading-none text-cream/85 transition-colors group-hover:text-cream">
                      {category.pluralName}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}
