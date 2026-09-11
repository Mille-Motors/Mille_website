import type { Metadata } from "next";
import { Car } from "lucide-react";
import { ButtonLink, ExternalButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { WhatsappIcon } from "@/components/ui/BrandIcons";
import { InventoryControls } from "@/components/vehicle/InventoryControls";
import { VehicleGrid } from "@/components/vehicle/VehicleGrid";
import { applyFilters, parseFilters } from "@/lib/filters";
import { generalWhatsappUrl } from "@/lib/whatsapp";
import { getFilterFacets, getVehicles } from "@/lib/vehicles";

export const metadata: Metadata = {
  title: "Vehículos disponibles",
  description:
    "Inventario de vehículos premium seleccionados por MILLE en Bogotá.",
};

export default async function InventoryPage(props: PageProps<"/vehiculos">) {
  const searchParams = await props.searchParams;
  const [vehicles, facets] = await Promise.all([getVehicles(), getFilterFacets()]);
  const filters = parseFilters(searchParams, facets.makes);
  const results = applyFilters(vehicles, filters);

  return (
    <>
      <section className="bg-cream pt-14 pb-10 lg:pt-20">
        <Container width="wide">
          <Eyebrow>Inventario</Eyebrow>
          <h1 className="mt-6 font-display text-[clamp(2.25rem,4.8vw,3.5rem)] leading-[1.06] text-ink">
            Vehículos disponibles
          </h1>
          <p className="mt-6 max-w-xl font-serif text-[1.0625rem] leading-[1.7] text-ink-soft">
            Cada vehículo pasa por nuestra revisión antes de llegar a esta
            página. Filtra por lo que buscas y escríbenos cuando quieras verlo.
          </p>
        </Container>
      </section>

      <Container width="wide">
        <InventoryControls
          filters={filters}
          facets={facets}
          resultCount={results.length}
        />
      </Container>

      <section className="bg-cream pt-9 pb-20 lg:pb-24">
        <Container width="wide">
          {results.length > 0 ? (
            <>
              <p className="label-caps mb-7 text-ink-muted">
                {results.length} {results.length === 1 ? "vehículo" : "vehículos"}
              </p>
              <VehicleGrid vehicles={results} columns={4} priorityCount={4} />
            </>
          ) : (
            <EmptyState
              icon={<Car aria-hidden className="size-10" strokeWidth={0.9} />}
              title={
                <>
                  No hemos encontrado vehículos
                  <br className="hidden sm:block" /> que coincidan con tus
                  filtros.
                </>
              }
              description="Intenta ajustar tus filtros o contáctanos directamente. Estamos para ayudarte a encontrar el vehículo ideal."
              actions={
                <>
                  <ButtonLink href="/vehiculos" size="lg">
                    Limpiar filtros
                  </ButtonLink>
                  <ExternalButtonLink
                    href={generalWhatsappUrl()}
                    variant="outline"
                    size="lg"
                  >
                    <WhatsappIcon className="size-4" />
                    WhatsApp
                  </ExternalButtonLink>
                </>
              }
            />
          )}
        </Container>
      </section>
    </>
  );
}
