import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VehicleCard } from "@/components/vehicle/VehicleCard";
import { getFeaturedVehicles } from "@/lib/vehicles";

export async function FeaturedVehicles() {
  const vehicles = await getFeaturedVehicles(4);

  return (
    <section className="bg-cream py-16 lg:py-20">
      <Container width="wide">
        <SectionHeading
          title="Vehículos destacados"
          action={
            <Link
              href="/vehiculos"
              className="label-caps group inline-flex items-center gap-2.5 text-ink-muted transition-colors hover:text-burgundy"
            >
              Ver todos los vehículos
              <ArrowRight
                aria-hidden
                strokeWidth={1.25}
                className="size-4 transition-transform group-hover:translate-x-1"
              />
            </Link>
          }
        />

        {/* Horizontal rail on phones, four-up grid from large screens. */}
        <ul className="mt-9 -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-5 sm:gap-y-9 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
          {vehicles.map((vehicle, index) => (
            <li
              key={vehicle.id}
              className="flex w-[78vw] shrink-0 snap-start sm:w-auto sm:shrink"
            >
              <VehicleCard
                vehicle={vehicle}
                priority={index === 0}
                sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 78vw"
              />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
