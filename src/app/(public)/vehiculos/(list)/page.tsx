import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Rule } from "@/components/ui/Rule";
import { CategoryNav } from "@/components/vehicle/CategoryNav";
import { FilterBar } from "@/components/vehicle/FilterBar";
import { InventoryAnchorScroll } from "@/components/vehicle/InventoryAnchorScroll";
import { TypeSelector } from "@/components/vehicle/TypeSelector";
import { VehicleGrid } from "@/components/vehicle/VehicleGrid";
import { site } from "@/data/site";
import { typeNoun } from "@/lib/categories";
import { canonical, socialMetadata } from "@/lib/seo";
import {
  activeFilterCount,
  hasInvalidType,
  inventoryHref,
  parseFilters,
  sortToQuery,
} from "@/lib/filters";
import {
  inventoryEmptyState,
  type InventoryEmptyState,
} from "@/lib/inventory-empty-state";
import { getFilterFacets, getVehicles } from "@/lib/vehicles";

const LIST_TITLE = "Vehículos";
const LIST_DESCRIPTION =
  "Carros y motos seleccionados por MILLE. Explora el inventario disponible de nuestra House of Motor Culture en Bogotá.";

/**
 * El canonical es siempre `/vehiculos`, sin parámetros.
 *
 * Filtrar no crea páginas: `?tipo=moto`, `?marca=BMW` o `?orden=precio-asc`
 * son recortes de esta misma vista, y dejar que cada combinación se indexara
 * por su cuenta llenaría el índice de copias del mismo inventario compitiendo
 * entre ellas. Que esta metadata sea estática mientras la página sí lee los
 * parámetros es justo lo que lo garantiza: se filtra igual, se indexa una vez.
 */
export const metadata: Metadata = {
  title: LIST_TITLE,
  description: LIST_DESCRIPTION,
  alternates: canonical("/vehiculos"),
  ...socialMetadata({
    title: `${LIST_TITLE} | ${site.name}`,
    description: LIST_DESCRIPTION,
    path: "/vehiculos",
  }),
};

/** Context copy per universe. Short: the vehicles do the talking. */
const context = {
  auto: "Desde el carro para todos los días hasta algo que llevabas años queriendo encontrar.",
  moto: "Distintas formas de rodar. La misma razón para salir.",
  all: "Carros y motos, en un mismo lugar.",
} as const;

export default async function InventoryPage(props: PageProps<"/vehiculos">) {
  const searchParams = await props.searchParams;

  // Un `tipo` que no es un universo se canonicaliza redirigiendo: mostrar el
  // inventario completo dejando `?tipo=camion` en la barra haría creer que
  // hay un filtro aplicado.
  //
  // Nota sobre el estado HTTP: el esqueleto de carga de este segmento abre un
  // Suspense, así que la cabecera ya salió cuando se decide el redirect y
  // Next lo entrega como instrucción al cliente en vez de como 307. El
  // navegador corrige la URL igual y no se renderiza ni una card; se
  // conserva el esqueleto porque perder la UX de carga de todo el inventario
  // para ganar el código de estado de una URL malformada es mal cambio. La
  // ficha de vehículo sí renuncia a su esqueleto, porque ahí el 404 real sí
  // importa.
  if (hasInvalidType(searchParams)) {
    redirect(inventoryHref(parseFilters({ ...searchParams, tipo: undefined })));
  }

  const filters = parseFilters(searchParams);

  // Las facetas se acotan al universo elegido, para que los filtros nunca
  // ofrezcan una marca o un año que ese universo no tiene. Un universo sin
  // publicados devuelve facetas vacías, no las del otro.
  const facets = await getFilterFacets(filters.tipo);

  // El filtrado y el orden ocurren en la base: el navegador no necesita
  // recibir el inventario entero para descartar la mayor parte.
  const results = await getVehicles({
    vehicleType: filters.tipo === "all" ? undefined : filters.tipo,
    categorySlug: filters.categoria,
    make: filters.marca,
    minYear: filters.minYear,
    maxYear: filters.maxYear,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    sort: sortToQuery[filters.orden],
  });

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
              <CategoryNav filters={filters} categories={facets.categories} />
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
            <NoResults
              // `counts.all` es el total publicado de todo el inventario, no
              // el de esta consulta: es lo que distingue "MILLE todavía no
              // publica nada" de "estos filtros no devuelven nada".
              state={inventoryEmptyState({
                publishedTotal: facets.counts.all,
                activeFilters: activeFilterCount(filters),
              })}
              filters={filters}
            />
          )}
        </Container>
      </section>
    </>
  );
}

/**
 * Una rejilla vacía sigue siendo una conversación. El texto lo decide
 * `inventoryEmptyState()`, que distingue el inventario que todavía no
 * empieza del filtro que no encuentra nada; aquí solo se pinta, con el mismo
 * aire editorial que el resto de la página.
 */
function NoResults({
  state,
  filters,
}: {
  state: InventoryEmptyState;
  filters: ReturnType<typeof parseFilters>;
}) {
  return (
    <div className="border-y border-stone py-20 lg:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>{state.eyebrow}</Eyebrow>
        <h2 className="mt-5 font-display text-[clamp(1.5rem,3.4vw,2.25rem)] leading-[1.15] text-ink uppercase">
          {state.headline}
        </h2>
        <Rule className="mx-auto mt-7" />
        <p className="mt-7 font-serif text-[1.0625rem] leading-[1.75] text-ink-soft">
          {state.body}
        </p>
        <p className="mt-4 font-serif text-[0.9375rem] leading-[1.7] text-ink-muted">
          {state.secondary}
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href={state.cta.href} size="lg">
            {state.cta.label}
          </ButtonLink>
          {state.showClearFilters ? (
            <ButtonLink
              href={inventoryHref({ tipo: filters.tipo })}
              variant="ghost"
              size="lg"
            >
              Limpiar filtros
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </div>
  );
}
