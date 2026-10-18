import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { TextLink } from "@/components/ui/Arrow";
import { StatusPill } from "@/components/ui/StatusPill";
import { StickyWhatsapp } from "@/components/vehicle/StickyWhatsapp";
import { VehicleCard } from "@/components/vehicle/VehicleCard";
import { VehicleContactActions } from "@/components/vehicle/VehicleContactActions";
import {
  VehicleDetails,
  type DetailSection,
} from "@/components/vehicle/VehicleDetails";
import {
  VehicleEquipment,
  VehicleHighlights,
} from "@/components/vehicle/VehicleEquipment";
import { VehicleFunFact } from "@/components/vehicle/VehicleFunFact";
import { VehicleGallery } from "@/components/vehicle/VehicleGallery";
import { VehicleQuickFacts } from "@/components/vehicle/VehicleQuickFacts";
import { SpecTable, VehicleSpecs } from "@/components/vehicle/VehicleSpecs";
import { VehicleTags } from "@/components/vehicle/VehicleTags";
import { JsonLd } from "@/components/seo/JsonLd";
import { WhatsappFloat } from "@/components/whatsapp/WhatsappFloat";
import { site } from "@/data/site";
import { formatCOP, formatMileage, vehicleTitle } from "@/lib/format";
import {
  documentationRows,
  electrificationBlocks,
  quickFacts,
  specBlocks,
} from "@/lib/vehicle-display";
import {
  NOINDEX_ROBOTS,
  absoluteImageUrl,
  breadcrumbJsonLd,
  canonical,
  socialMetadata,
  vehicleJsonLd,
  vehicleMetaDescription,
  vehicleMetaTitle,
  vehiclePath,
} from "@/lib/seo";
import { equipmentSections } from "@/lib/equipment";
import { isFullyElectric } from "@/types/vehicle";
import { getRelatedVehicles, getVehicleBySlug } from "@/lib/vehicles";
import { vehicleWhatsappUrl } from "@/lib/whatsapp";
import { REVEAL } from "@/lib/reveal";

/**
 * No hay `generateStaticParams`: la base es la fuente de verdad y publicar
 * desde el admin tiene que verse de inmediato, no en el siguiente build.
 * Prerenderizar aquí ataría además cada despliegue a que la base esté
 * disponible en tiempo de compilación. Con 22 vehículos, consultar por
 * petición no cuesta nada, y `revalidatePath` se encarga del caché de ruta.
 */

export async function generateMetadata(
  props: PageProps<"/vehiculos/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const vehicle = await getVehicleBySlug(slug);

  // Solo llega aquí lo PUBLICADO: `getVehicleBySlug` no devuelve borradores
  // ni archivados. Un slug que no existe —o que dejó de estar publicado—
  // renderiza la página de "no encontrado", y esa no se indexa. Importa
  // desde hoy: el segmento responde 200 por los esqueletos de carga que
  // tiene encima (ver docs/backend.md), así que sin este `noindex` Google
  // guardaría una URL rota como si fuera contenido.
  if (!vehicle) {
    return { title: "Vehículo no encontrado", robots: NOINDEX_ROBOTS };
  }

  const title = vehicleMetaTitle(vehicle);
  const description = vehicleMetaDescription(vehicle);
  const path = vehiclePath(vehicle.slug);

  return {
    title,
    description,
    alternates: canonical(path),
    ...socialMetadata({
      title: `${title} | ${site.name}`,
      description,
      path,
      // La portada real del vehículo, absoluta: puede venir de /public o de
      // Supabase Storage, y una previsualización no resuelve rutas relativas.
      images: [
        {
          url: absoluteImageUrl(vehicle.images[0].src),
          alt: vehicle.images[0].alt || title,
        },
      ],
    }),
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

  // Todo lo que se dibuja abajo se decide aquí, y `vehicle-display` solo
  // devuelve lo que tiene valor: una sección que quedaría vacía no llega a
  // existir, en vez de renderizarse con su título y una tabla de "N/A".
  const facts = quickFacts(vehicle);
  const blocks = specBlocks(vehicle);
  const electric = electrificationBlocks(vehicle);
  const papers = documentationRows(vehicle);
  const highlights = vehicle.specialEquipment;
  const funFactVisible =
    vehicle.funFact.enabled && Boolean(vehicle.funFact.body?.trim());
  const equipmentGroups = equipmentSections(vehicle.equipment);

  /**
   * Lo consultable, en el orden en que se consulta. Una sección que se
   * quedaría vacía no se construye: no hay títulos sin nada debajo.
   */
  const details: DetailSection[] = [];

  if (blocks.length > 0) {
    details.push({
      id: "especificaciones",
      title: "Especificaciones",
      hint: `${blocks.length} ${blocks.length === 1 ? "grupo" : "grupos"}`,
      children: <VehicleSpecs blocks={blocks} columns />,
    });
  }

  if (electric.length > 0) {
    details.push({
      id: "sistema",
      title: `Sistema ${isFullyElectric(vehicle.fuelType) ? "eléctrico" : "híbrido"}`,
      children: <VehicleSpecs blocks={electric} columns />,
    });
  }

  if (highlights.length > 0 || equipmentGroups.length > 0) {
    details.push({
      id: "equipamiento",
      title: "Equipamiento",
      hint:
        equipmentGroups.length > 0
          ? `${equipmentGroups.length} ${equipmentGroups.length === 1 ? "sección" : "secciones"}`
          : undefined,
      children: (
        <div className="grid gap-12">
          {/* Lo destacado va primero y con otro peso: es lo que distingue
              esta unidad de otra igual, no una línea más de una lista. */}
          {highlights.length > 0 ? (
            <section>
              <h4 className="mb-4 text-[1.25rem] leading-snug font-medium text-burgundy">
                Equipamiento destacado
              </h4>
              <VehicleHighlights items={highlights} />
            </section>
          ) : null}
          {equipmentGroups.length > 0 ? (
            <VehicleEquipment equipment={vehicle.equipment} />
          ) : null}
        </div>
      ),
    });
  }

  if (papers.length > 0) {
    details.push({
      id: "documentacion",
      title: "Documentación",
      children: (
        <div className="max-w-3xl">
          <SpecTable rows={papers} />
          {vehicle.documentation.documentationNotes ? (
            <p className="mt-6 text-[1.125rem] leading-relaxed text-ink-muted">
              {vehicle.documentation.documentationNotes}
            </p>
          ) : null}
        </div>
      ),
    });
  }

  const crumb = "transition-colors hover:text-cream";

  return (
    <>
      {/* Los datos del vehículo tal como schema.org los describe, y la misma
          ruta que se ve justo debajo. Ambos salen de la ficha real: no hay
          ningún dato aquí que la página no muestre. */}
      <JsonLd data={vehicleJsonLd(vehicle)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Inicio", path: "/" },
          { name: "Vehículos", path: "/vehiculos" },
          {
            name: vehicle.make,
            path: `/vehiculos?marca=${encodeURIComponent(vehicle.make)}`,
          },
          { name: vehicleMetaTitle(vehicle), path: vehiclePath(vehicle.slug) },
        ])}
      />

      {/* Arriba, en oscuro: la fotografía y el resumen. A la izquierda la
          galería; a la derecha el nombre, el precio, las cifras y las
          acciones. En teléfono se apilan en ese orden de lectura: nombre,
          fotografías, precio y cifras. */}
      <section className="bg-dark pt-6 pb-[clamp(3rem,6vw,6rem)] text-cream">
        <div className="wrap">
          <nav aria-label="Ruta">
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.9375rem] text-cream/60">
              <li>
                <Link href="/" className={crumb}>
                  Inicio
                </Link>
              </li>
              <ChevronRight aria-hidden className="size-3.5" strokeWidth={1.4} />
              <li>
                <Link href="/vehiculos" className={crumb}>
                  Vehículos
                </Link>
              </li>
              <ChevronRight aria-hidden className="size-3.5" strokeWidth={1.4} />
              <li>
                <Link
                  href={`/vehiculos?marca=${encodeURIComponent(vehicle.make)}`}
                  className={crumb}
                >
                  {vehicle.make}
                </Link>
              </li>
              <ChevronRight aria-hidden className="size-3.5" strokeWidth={1.4} />
              <li aria-current="page" className="text-cream">
                {vehicle.model} {vehicle.version}
              </li>
            </ol>
          </nav>

          <div className="mt-7 grid gap-x-[5vw] gap-y-9 lg:mt-9 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)] lg:gap-y-10">
            <div className="lg:col-start-2 lg:row-start-1">
              <h1
                className="text-[clamp(2.25rem,3.4vw+1rem,4.75rem)] leading-[1.04] tracking-[-0.01em]"
                {...REVEAL}
              >
                {title}
              </h1>
              <p
                className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[1.125rem] text-cream/70 tabular"
                {...REVEAL}
                style={{ "--d": "80ms" } as React.CSSProperties}
              >
                <span>{vehicle.year}</span>
                {vehicle.mileage !== null ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{formatMileage(vehicle.mileage)}</span>
                  </>
                ) : null}
                {vehicle.fuelType ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{vehicle.fuelType}</span>
                  </>
                ) : null}
              </p>
            </div>

            <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
              <VehicleGallery images={vehicle.images} name={title} />
            </div>

            <div
              className="lg:col-start-2 lg:row-start-2"
              {...REVEAL}
              style={{ "--d": "140ms" } as React.CSSProperties}
            >
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                {/* Publicar exige precio, así que aquí siempre lo hay; si
                    faltara, la cabecera se queda sin la cifra antes que
                    anunciar "$ 0". */}
                {vehicle.price !== null ? (
                  <p className="text-[clamp(2rem,1.8vw+1.3rem,3.25rem)] leading-none tabular">
                    {formatCOP(vehicle.price)}
                    <span className="ml-2 text-base text-cream/55">COP</span>
                  </p>
                ) : null}
                <StatusPill status={vehicle.availability} tone="onBurgundy" />
              </div>

              <VehicleQuickFacts
                facts={facts}
                className="mt-9 border-t border-cream/15 pt-8"
              />

              <VehicleContactActions
                vehicle={vehicle}
                variant="summary"
                className="mt-9 hidden lg:grid"
              />
            </div>
          </div>
        </div>
      </section>

      {/* El relato, en una medida de lectura y no a 1.400 px: un párrafo de
          ciento veinte caracteres por línea no se lee, se recorre. */}
      <section className="section-y bg-cream">
        <div className="wrap grid gap-8 lg:grid-cols-[0.8fr_1fr] lg:gap-[8vw]">
          <div {...REVEAL}>
            <h2 className="text-heading max-w-[14ch]">
              Acerca de este vehículo
            </h2>
            <p className="mt-4 max-w-[28ch] text-[1.125rem] leading-snug text-ink-muted">
              Una visión general de su configuración, estado y detalles clave.
            </p>
          </div>

          <div
            className="max-w-160"
            {...REVEAL}
            style={{ "--d": "100ms" } as React.CSSProperties}
          >
            {/* `whitespace-pre-line` conserva los párrafos que se
                escribieron en el admin. */}
            <p className="text-[1.25rem] leading-[1.65] whitespace-pre-line text-ink-soft">
              {vehicle.description}
            </p>

            {vehicle.tags.length > 0 ? (
              <div className="mt-8">
                <VehicleTags vehicle={vehicle} />
              </div>
            ) : null}

            {/* El apunte editorial, si existe: es de la misma naturaleza que
                el relato —algo que contar, no un dato que consultar—. */}
            {funFactVisible ? (
              <div className="mt-10">
                <VehicleFunFact funFact={vehicle.funFact} />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Todo lo consultable, en una sola pila desplegable y con el MISMO
          patrón en teléfono y en escritorio. Antes el escritorio abría dos
          columnas con todo desplegado a la vez y no había por dónde empezar
          a mirar. */}
      {details.length > 0 ? (
        <section className="bg-cream pb-(--space)">
          <div className="wrap">
            <h2 className="text-heading mb-8 lg:mb-10" {...REVEAL}>
              Detalles del vehículo
            </h2>
            <VehicleDetails sections={details} />
          </div>
        </section>
      ) : null}

      {/* El cierre: vinotinto, con las tres maneras de preguntar. Es el ancla
          de la barra fija del teléfono. */}
      <section className="bg-burgundy py-[clamp(4rem,8vw,8rem)] text-cream">
        <div className="wrap">
          <div className="mb-10 grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-[8vw]">
            <h2 className="text-title" {...REVEAL}>
              ¿Te interesa este vehículo?
            </h2>
            <p
              className="max-w-96 text-[1.375rem] leading-snug lg:justify-self-end"
              {...REVEAL}
              style={{ "--d": "100ms" } as React.CSSProperties}
            >
              Escríbenos, pregunta lo que quieras o agenda una visita. Te
              respondemos con calma.
            </p>
          </div>
          <VehicleContactActions vehicle={vehicle} variant="closing" />
        </div>
      </section>

      {related.length > 0 ? (
        <section className="section-y bg-cream">
          <div className="wrap">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 lg:mb-12">
              <h2 className="text-heading" {...REVEAL}>
                Vehículos relacionados
              </h2>
              <TextLink href="/vehiculos" className="text-ink">
                Ver más vehículos
              </TextLink>
            </div>
            <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8">
              {related.map((item, index) => (
                <li
                  key={item.id}
                  className="flex"
                  {...REVEAL}
                  style={{ "--d": `${index * 90}ms` } as React.CSSProperties}
                >
                  <VehicleCard
                    vehicle={item}
                    sizes="(min-width: 1024px) 28vw, (min-width: 640px) 44vw, 92vw"
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Room for the fixed phone bar, whatever the last section is. */}
      <div aria-hidden className="h-20 lg:hidden" />

      <StickyWhatsapp vehicle={vehicle} />

      {/* En escritorio, el botón flotante de la ficha lleva directo al chat de
          ESTE vehículo: el mensaje ya dice cuál es. En móvil lo hace la barra. */}
      {vehicleWhatsappUrl(vehicle) ? (
        <WhatsappFloat
          direct={{
            href: vehicleWhatsappUrl(vehicle)!,
            label: `Escribir a MILLE por WhatsApp sobre el ${vehicleTitle(vehicle)}`,
            slug: vehicle.slug,
          }}
        />
      ) : null}
    </>
  );
}
