import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClosingCta } from "@/components/home/ClosingCta";
import { ButtonLink } from "@/components/ui/Button";
import { CategoryNav } from "@/components/vehicle/CategoryNav";
import { FilterBar } from "@/components/vehicle/FilterBar";
import { InventoryAnchorScroll } from "@/components/vehicle/InventoryAnchorScroll";
import { InventorySearch } from "@/components/vehicle/InventorySearch";
import { TypeToggle } from "@/components/vehicle/TypeToggle";
import { VehicleGrid } from "@/components/vehicle/VehicleGrid";
import { site } from "@/data/site";
import { typeNoun } from "@/lib/categories";
import { canonical, socialMetadata } from "@/lib/seo";
import {
  activeFilterCount,
  clearedFilters,
  hasInvalidType,
  hasLegacyBodySlug,
  inventoryHref,
  parseFilters,
  sortToQuery,
} from "@/lib/filters";
import {
  inventoryEmptyState,
  type InventoryEmptyState,
} from "@/lib/inventory-empty-state";
import { getFilterFacets, getVehicles } from "@/lib/vehicles";
import { REVEAL } from "@/lib/reveal";
import { defaultOgImages } from "@/server/site-media/og";

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
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: LIST_TITLE,
    description: LIST_DESCRIPTION,
    alternates: canonical("/vehiculos"),
    ...socialMetadata({
      images: await defaultOgImages(),
      title: `${LIST_TITLE} | ${site.name}`,
      description: LIST_DESCRIPTION,
      path: "/vehiculos",
    }),
  };
}

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

  // Lo mismo con una carrocería que cambió de nombre: `?categoria=suv` se lee
  // como camionetas, y la barra debe decirlo.
  if (hasLegacyBodySlug(searchParams)) {
    redirect(inventoryHref(parseFilters(searchParams)));
  }

  const filters = parseFilters(searchParams);

  // Las facetas se acotan al universo elegido, para que los filtros nunca
  // ofrezcan una marca o un año que ese universo no tiene. Un universo sin
  // publicados devuelve facetas vacías, no las del otro.
  const facets = await getFilterFacets(filters.tipo);

  // El filtrado y el orden ocurren en la base: el navegador no necesita
  // recibir el inventario entero para descartar la mayor parte.
  // Todos los filtros son condiciones simultáneas: carrocería camioneta con
  // combustible enchufable y precio máximo devuelve las camionetas enchufables
  // por debajo de ese precio, no la suma de las tres listas.
  const results = await getVehicles({
    vehicleType: filters.tipo === "all" ? undefined : filters.tipo,
    categorySlug: filters.categoria,
    make: filters.marca,
    model: filters.modelo,
    fuelType: filters.combustible,
    transmission: filters.transmision,
    drivetrain: filters.traccion,
    finalDrive: filters.transmisionFinal,
    city: filters.ciudad,
    tag: filters.etiqueta,
    minYear: filters.minYear,
    maxYear: filters.maxYear,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minMileage: filters.minKm,
    maxMileage: filters.maxKm,
    search: filters.q,
    sort: sortToQuery[filters.orden],
  });

  const noun =
    filters.tipo === "all"
      ? { one: "vehículo", many: "vehículos" }
      : typeNoun[filters.tipo];

  return (
    <>
      <InventoryAnchorScroll />

      {/* Entry: one big sentence, and what this universe is about. */}
      <section className="bg-cream pt-[clamp(2.5rem,5vw,5rem)] pb-[clamp(2rem,4vw,3.5rem)]">
        <div className="wrap grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-[8vw]">
          <h1 className="text-title" {...REVEAL}>
            Encuentra
            <br className="hidden sm:block" /> lo que te mueve.
          </h1>
          <p
            className="max-w-104 pb-2 text-[1.25rem] leading-snug text-ink-soft lg:justify-self-end"
            {...REVEAL}
            style={{ "--d": "120ms" } as React.CSSProperties}
          >
            {context[filters.tipo]}
          </p>
        </div>
      </section>

      {/* Cómo se busca, de lo más amplio a lo más fino: escribir, cuatro o dos
          ruedas, carrocería, y la barra con el resto. Es el ancla del botón
          «Ver inventario»: aterriza aquí, directamente en la primera decisión,
          y debajo vienen la rejilla y sus resultados. */}
      <section id="inventario" className="scroll-mt-header bg-cream pb-6">
        {/* Una sola columna que no crece con su contenido: la fila de
            píldoras de categoría se desliza hacia un lado y, sin
            «minmax(0, 1fr)», su ancho natural ensancharía la columna entera
            y el buscador se saldría de la pantalla. */}
        <div className="wrap grid grid-cols-[minmax(0,1fr)] gap-4">
          <InventorySearch filters={filters} />

          <TypeToggle filters={filters} />

          {filters.tipo !== "all" ? (
            <CategoryNav filters={filters} categories={facets.categories} />
          ) : null}

          <FilterBar filters={filters} facets={facets} />
        </div>
      </section>

      {/* Results */}
      <section className="bg-cream pt-6 pb-[clamp(4rem,8vw,8rem)]">
        <div className="wrap">
          {results.length > 0 ? (
            <>
              <p className="mb-8 text-base text-ink-muted tabular">
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
        </div>
      </section>

      <ClosingCta
        title="¿No ves el que buscas?"
        body="Cuéntanos qué tienes en mente y lo buscamos contigo."
      />
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
    <div className="max-w-3xl py-8 lg:py-16">
      <h2 className="text-heading">{state.headline}</h2>
      <p className="mt-6 text-[1.25rem] leading-[1.5] text-ink-soft">
        {state.body}
      </p>
      <p className="mt-4 text-base leading-[1.6] text-ink-muted">
        {state.secondary}
      </p>
      <div className="mt-9 flex flex-wrap items-center gap-3">
        <ButtonLink href={state.cta.href} size="lg">
          {state.cta.label}
        </ButtonLink>
        {state.showClearFilters ? (
          <ButtonLink
            href={inventoryHref(clearedFilters(filters))}
            variant="ghost"
            size="lg"
          >
            Limpiar filtros
          </ButtonLink>
        ) : null}
      </div>
    </div>
  );
}
