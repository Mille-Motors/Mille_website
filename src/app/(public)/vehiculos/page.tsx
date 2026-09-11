import type { Metadata } from "next";
import { ButtonLink, ExternalButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Rule } from "@/components/ui/Rule";
import { WhatsappIcon } from "@/components/ui/BrandIcons";
import { CategoryNav } from "@/components/vehicle/CategoryNav";
import { FilterBar } from "@/components/vehicle/FilterBar";
import { InventoryAnchorScroll } from "@/components/vehicle/InventoryAnchorScroll";
import { TypeSelector } from "@/components/vehicle/TypeSelector";
import { VehicleGrid } from "@/components/vehicle/VehicleGrid";
import { typeNoun } from "@/lib/categories";
import { applyFilters, inventoryHref, parseFilters } from "@/lib/filters";
import { generalWhatsappUrl } from "@/lib/whatsapp";
import { getFilterFacets, getVehicles } from "@/lib/vehicles";

export const metadata: Metadata = {
  title: "Inventario",
  description: "Carros y motos seleccionados por MILLE en Bogotá.",
};

/** Context copy per universe. Short: the vehicles do the talking. */
const context = {
  auto: "Desde el carro para todos los días hasta algo que llevabas años queriendo encontrar.",
  moto: "Distintas formas de rodar. La misma razón para salir.",
  all: "Carros y motos, en un mismo lugar.",
} as const;

export default async function InventoryPage(props: PageProps<"/vehiculos">) {
  const searchParams = await props.searchParams;

  // Facets are scoped to the chosen universe, so the filters never offer a
  // make or a year that this universe does not actually have. Parsed in two
  // passes because the scope itself comes from the URL.
  const preliminary = parseFilters(searchParams, []);
  const [vehicles, facets] = await Promise.all([
    getVehicles(),
    getFilterFacets(preliminary.tipo),
  ]);
  // Validated against every make in the inventory, while the dropdown is
  // still scoped: "Carros + KTM" is an honest zero, not a silent full list.
  const allMakes = [...new Set(vehicles.map((v) => v.make))];
  const filters = parseFilters(searchParams, allMakes);
  const results = applyFilters(vehicles, filters);

  const noun =
    filters.tipo === "all"
      ? { one: "vehículo", many: "vehículos" }
      : typeNoun[filters.tipo];

  return (
    <>
      <InventoryAnchorScroll />

      {/* Entry */}
      <section className="bg-cream pt-12 pb-10 lg:pt-16">
        <Container width="wide">
          <Eyebrow>Inventario</Eyebrow>
          <h1 className="mt-5 max-w-2xl font-display text-[clamp(2.125rem,4.6vw,3.25rem)] leading-[1.06] text-ink uppercase">
            Encuentra lo que te mueve.
          </h1>
          <Rule className="mt-7" />
        </Container>
      </section>

      {/* The first decision of the page */}
      <section className="bg-cream pb-12">
        <Container width="wide">
          <TypeSelector filters={filters} counts={facets.counts} />
        </Container>
      </section>

      {/* Context + categories for the chosen universe. Anchor target for the
          "Ver inventario" CTA: it lands here, past the Carros/Motos/Todo
          choice, directly on filters + count + grid. */}
      <section id="inventario" className="scroll-mt-20 border-t border-stone bg-cream pt-10">
        <Container width="wide">
          <p className="max-w-xl font-serif text-[1.0625rem] leading-[1.7] text-ink-soft">
            {context[filters.tipo]}
          </p>

          {filters.tipo !== "all" ? (
            <div className="mt-8">
              <CategoryNav
                filters={filters}
                type={filters.tipo}
                available={facets.categories}
              />
            </div>
          ) : null}

          <div className="mt-8 border-t border-stone pt-6">
            <FilterBar filters={filters} facets={facets} />
          </div>
        </Container>
      </section>

      {/* Results */}
      <section className="bg-cream pt-10 pb-20 lg:pb-28">
        <Container width="wide">
          {results.length > 0 ? (
            <>
              <p className="label-caps mb-8 text-ink-muted tabular">
                {results.length} {results.length === 1 ? noun.one : noun.many}
              </p>
              <VehicleGrid vehicles={results} priorityCount={3} />
            </>
          ) : (
            <NoResults filters={filters} />
          )}
        </Container>
      </section>
    </>
  );
}

/**
 * An empty result is still a conversation. MILLE can look for a vehicle it
 * does not have in stock — without promising to find it.
 */
function NoResults({
  filters,
}: {
  filters: ReturnType<typeof parseFilters>;
}) {
  return (
    <div className="border-y border-stone py-20 lg:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-[clamp(1.5rem,3.4vw,2.25rem)] leading-[1.15] text-ink uppercase">
          No tenemos algo que encaje
          <br className="hidden sm:block" /> con esos filtros en este momento.
        </h2>
        <p className="mt-6 font-serif text-[1.0625rem] leading-[1.75] text-ink-soft">
          Eso no significa que no podamos ayudarte a buscarlo. Cuéntanos qué
          tienes en mente y lo rastreamos.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <ExternalButtonLink href={generalWhatsappUrl()} size="lg">
            <WhatsappIcon className="size-4" />
            Escríbenos
          </ExternalButtonLink>
          <ButtonLink
            href={inventoryHref({ tipo: filters.tipo })}
            variant="ghost"
            size="lg"
          >
            Limpiar filtros
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
