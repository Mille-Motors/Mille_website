import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Rule } from "@/components/ui/Rule";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatusPill } from "@/components/ui/StatusPill";
import { MobileAccordion } from "@/components/vehicle/MobileAccordion";
import { StickyWhatsapp } from "@/components/vehicle/StickyWhatsapp";
import { VehicleCard } from "@/components/vehicle/VehicleCard";
import { VehicleContactActions } from "@/components/vehicle/VehicleContactActions";
import { VehicleEquipment } from "@/components/vehicle/VehicleEquipment";
import { VehicleGallery } from "@/components/vehicle/VehicleGallery";
import { VehicleSpecs, specRows } from "@/components/vehicle/VehicleSpecs";
import { formatCOP, formatMileage, vehicleTitle } from "@/lib/format";
import {
  getAllVehicleSlugs,
  getRelatedVehicles,
  getVehicleBySlug,
} from "@/lib/vehicles";

export async function generateStaticParams() {
  const slugs = await getAllVehicleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/vehiculos/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle) return { title: "Vehículo no encontrado" };

  const title = `${vehicleTitle(vehicle)} ${vehicle.year}`;
  return {
    title,
    description: vehicle.description.slice(0, 155),
    openGraph: {
      title,
      description: vehicle.description.slice(0, 155),
      images: [{ url: vehicle.images[0].src }],
    },
  };
}

export default async function VehicleDetailPage(
  props: PageProps<"/vehiculos/[slug]">,
) {
  const { slug } = await props.params;
  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle) notFound();

  const related = await getRelatedVehicles(vehicle);
  const title = vehicleTitle(vehicle);
  const rows = specRows(vehicle);

  return (
    <>
      {/* Breadcrumb + headline over the dark band, as in the comps. */}
      <section className="bg-black text-cream">
        <Container width="wide">
          <nav aria-label="Ruta" className="pt-6">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-cream/55">
              <li>
                <Link href="/" className="transition-colors hover:text-cream">
                  Inicio
                </Link>
              </li>
              <ChevronRight aria-hidden className="size-3" strokeWidth={1.5} />
              <li>
                <Link
                  href="/vehiculos"
                  className="transition-colors hover:text-cream"
                >
                  Vehículos
                </Link>
              </li>
              <ChevronRight aria-hidden className="size-3" strokeWidth={1.5} />
              <li>
                <Link
                  href={`/vehiculos?marca=${encodeURIComponent(vehicle.make)}`}
                  className="transition-colors hover:text-cream"
                >
                  {vehicle.make}
                </Link>
              </li>
              <ChevronRight aria-hidden className="size-3" strokeWidth={1.5} />
              <li aria-current="page" className="text-cream/80">
                {vehicle.model} {vehicle.version}
              </li>
            </ol>
          </nav>

          <div className="flex flex-col gap-6 pt-7 pb-10 lg:flex-row lg:items-end lg:justify-between lg:pb-12">
            <div>
              <h1 className="font-display text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.04] text-cream">
                {title}
              </h1>
              <p className="mt-4 flex items-center gap-3 font-serif text-[0.9375rem] text-cream/65 tabular">
                <span>{vehicle.year}</span>
                <span aria-hidden className="h-3.5 w-px bg-cream/25" />
                <span>{formatMileage(vehicle.mileage)}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <p className="font-display text-[clamp(1.75rem,3.4vw,2.5rem)] leading-none text-cream tabular">
                {formatCOP(vehicle.price)}
                <span className="ml-2 font-sans text-sm tracking-wide text-cream/55">
                  COP
                </span>
              </p>
              <StatusPill status={vehicle.status} />
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-cream pt-8 pb-12 lg:pt-10">
        <Container width="wide">
          <VehicleGallery images={vehicle.images} />
        </Container>
      </section>

      {/* Desktop: specs beside description. Phone: accordions. */}
      <section className="bg-cream pb-4">
        <Container width="wide">
          <div className="hidden gap-14 lg:grid lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl text-ink">Especificaciones</h2>
              <Rule className="mt-5 mb-7" />
              <VehicleSpecs vehicle={vehicle} rows={rows} />
            </div>

            <div>
              <h2 className="font-display text-3xl text-ink">Descripción</h2>
              <Rule className="mt-5 mb-7" />
              <p className="font-serif text-[1.0625rem] leading-[1.8] text-ink-soft">
                {vehicle.description}
              </p>

              <h2 className="mt-12 font-display text-3xl text-ink">
                Equipamiento destacado
              </h2>
              <Rule className="mt-5 mb-7" />
              <VehicleEquipment items={vehicle.equipment} />
            </div>
          </div>

          <div className="lg:hidden">
            <p className="font-serif text-[1.0625rem] leading-[1.75] text-ink-soft">
              {vehicle.description}
            </p>
            <div className="mt-8 border-t border-stone">
              <MobileAccordion title="Especificaciones" defaultOpen>
                <VehicleSpecs vehicle={vehicle} rows={rows} />
              </MobileAccordion>
              <MobileAccordion title="Equipamiento destacado">
                <VehicleEquipment items={vehicle.equipment} />
              </MobileAccordion>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-cream py-12">
        <Container width="wide">
          <VehicleContactActions vehicle={vehicle} />
        </Container>
      </section>

      {related.length > 0 ? (
        <section className="border-t border-stone bg-cream py-14">
          <Container width="wide">
            <SectionHeading
              title="Vehículos relacionados"
              action={
                <Link
                  href="/vehiculos"
                  className="label-caps group inline-flex items-center gap-2.5 text-ink-muted transition-colors hover:text-burgundy"
                >
                  Ver más vehículos
                  <ArrowRight
                    aria-hidden
                    strokeWidth={1.25}
                    className="size-4 transition-transform group-hover:translate-x-1"
                  />
                </Link>
              }
            />
            <ul className="mt-9 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <li key={item.id} className="flex">
                  <VehicleCard
                    vehicle={item}
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 88vw"
                  />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      {/* Room for the fixed phone bar, whatever the last section is. */}
      <div aria-hidden className="h-20 lg:hidden" />

      <StickyWhatsapp vehicle={vehicle} />
    </>
  );
}
