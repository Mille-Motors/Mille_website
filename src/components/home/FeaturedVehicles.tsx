import { SiteMediaPicture } from "@/components/media/SiteMediaPicture";
import Image from "next/image";
import Link from "next/link";
import { CategoryBand } from "@/components/home/CategoryBand";
import { RoundArrow, TextLink } from "@/components/ui/Arrow";
import { badgeClass, badgeFor } from "@/components/vehicle/vehicle-badge";
import { cn } from "@/lib/cn";
import { objectPosition } from "@/lib/focal-point";
import { formatCOP, formatMileage } from "@/lib/format";
import { getFeaturedVehicles } from "@/lib/vehicles";
import { getSiteMediaImage } from "@/server/site-media/service";
import type { Vehicle } from "@/types/vehicle";
import { REVEAL } from "@/lib/reveal";

/**
 * La primera sección de producto: dos fotografías grandes, una más baja que
 * la otra, sobre fondo oscuro. Es la parte de la home que más se parece a una
 * revista de motor.
 *
 * Con dos o más vehículos destacados en el inventario, las dos tarjetas son
 * esos vehículos, con su nombre, su precio y su enlace. Mientras no los haya,
 * son dos fotografías editoriales de cultura motor, administrables desde
 * /admin/contenido, que llevan al inventario y lo dicen en una nota: nunca
 * un vehículo inventado con su precio.
 */
const editorial = [
  { slot: "home.featured.a", line: "El gusto de conducir." },
  { slot: "home.featured.b", line: "Discreto. Hasta que arranca." },
] as const;

export async function FeaturedVehicles() {
  const [vehicles, first, second] = await Promise.all([
    getFeaturedVehicles(2),
    getSiteMediaImage(editorial[0].slot),
    getSiteMediaImage(editorial[1].slot),
  ]);
  const real = vehicles.length >= 2;
  const editorialImages = [first, second];

  return (
    <section
      id="vehiculos"
      className="section-y scroll-mt-header bg-dark text-cream"
    >
      <div className="wrap">
        <div className="mb-[clamp(2.5rem,5vw,4.5rem)] grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-[8vw]">
          <h2 className="text-title" {...REVEAL}>
            Siempre hay un
            <br className="hidden sm:block" /> próximo carro.
          </h2>
          <div
            className="max-w-104 pb-2 lg:justify-self-end"
            {...REVEAL}
            style={{ "--d": "120ms" } as React.CSSProperties}
          >
            <p className="text-[1.25rem] leading-snug text-cream/90">
              Uno que llevamos tiempo buscando, uno que nos sorprendió o uno
              que simplemente nos encanta. Conoce los carros y motos que
              tenemos en MILLE.
            </p>
            <TextLink href="/vehiculos" className="mt-6">
              Ver vehículos
            </TextLink>
          </div>
        </div>

        <ul className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-[4vw]">
          {(real ? vehicles.slice(0, 2) : editorial).map((entry, index) => (
            <li
              key={"id" in entry ? entry.id : entry.slot}
              {...REVEAL}
              style={{ "--d": `${index * 140}ms` } as React.CSSProperties}
              // El segundo baja: el desnivel es lo que evita que las dos
              // fotografías se lean como una rejilla.
              className={cn(index === 1 && "lg:mt-[22%]")}
            >
              {/* Sin `priority`: esta sección vive debajo de la portada, que
                  ocupa la pantalla entera. Precargarla competía con la
                  fotografía que de verdad es LCP y retrasaba justo la que
                  decide la primera impresión. Se carga en diferido, que es
                  lo que corresponde a lo que no se ve al llegar. */}
              {"id" in entry ? (
                <VehicleFeature vehicle={entry} />
              ) : (
                <EditorialFeature
                  image={editorialImages[index]}
                  line={entry.line}
                />
              )}
            </li>
          ))}
        </ul>

        {real ? null : (
          <p className="mt-10 text-sm text-cream/60">
            Imágenes de cultura motor. Consulta la disponibilidad en
            Vehículos.
          </p>
        )}

        <CategoryBand className="mt-[clamp(3rem,6vw,6rem)]" />
      </div>
    </section>
  );
}

function VehicleFeature({
  vehicle,
  priority,
}: {
  vehicle: Vehicle;
  priority?: boolean;
}) {
  const cover = vehicle.images[0];
  const badge = badgeFor(vehicle);
  const name = [vehicle.make, vehicle.model, vehicle.version]
    .filter(Boolean)
    .join(" ");
  const details = [
    String(vehicle.year),
    vehicle.mileage === null ? null : formatMileage(vehicle.mileage),
    vehicle.fuelType,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="group relative">
      <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-charcoal">
        <Image
          src={cover.src}
          alt={cover.alt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 52vw, 92vw"
          className="object-cover transition-transform duration-1200 ease-out-strong [@media(hover:hover)]:group-hover:scale-[1.035]"
          style={{ objectPosition: objectPosition(cover.focal) }}
        />
        {badge ? (
          <span
            className={cn(
              "absolute top-4 left-4 rounded-full px-3.5 py-1.5 text-sm leading-none",
              badgeClass[badge.tone],
            )}
          >
            {badge.label}
          </span>
        ) : null}
      </div>

      <div className="mt-6 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h3 className="text-[clamp(1.5rem,1.45vw+0.75rem,2.375rem)] leading-[1.15]">
            <Link
              href={`/vehiculos/${vehicle.slug}`}
              className="after:absolute after:inset-0 focus-visible:outline-none"
            >
              {name}
            </Link>
          </h3>
          <p className="mt-2 text-base text-cream/65 tabular">{details}</p>
          {vehicle.price !== null ? (
            <p className="mt-4 text-[1.375rem] leading-none tabular">
              {formatCOP(vehicle.price)}
            </p>
          ) : null}
        </div>
        <RoundArrow tone="dark" />
      </div>
    </article>
  );
}

/** Una fotografía de cultura motor con una frase, que lleva al inventario. */
function EditorialFeature({
  image,
  line,
  priority,
}: {
  image: Awaited<ReturnType<typeof getSiteMediaImage>>;
  line: string;
  priority?: boolean;
}) {
  return (
    <article className="group relative">
      <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-charcoal">
        <SiteMediaPicture
          image={image}
          priority={priority}
          sizes="(min-width: 1024px) 52vw, 92vw"
          quality={90}
          className="object-cover transition-transform duration-1200 ease-out-strong [@media(hover:hover)]:group-hover:scale-[1.035]"
        />
      </div>

      <div className="mt-6 flex items-center justify-between gap-6">
        <h3 className="text-[clamp(1.5rem,1.45vw+0.75rem,2.375rem)] leading-[1.15]">
          <Link
            href="/vehiculos"
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {line}
          </Link>
        </h3>
        <RoundArrow tone="dark" />
      </div>
    </article>
  );
}
