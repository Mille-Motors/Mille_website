import Image from "next/image";
import { getSiteMediaImage } from "@/server/site-media/service";
import { objectPosition } from "@/lib/focal-point";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Rule } from "@/components/ui/Rule";
import { InventoryCTALink } from "@/components/vehicle/InventoryCTALink";
import { site } from "@/data/site";

export async function Hero() {
  // La fotografía se administra desde /admin/contenido. Si no se ha
  // cambiado nunca —o la base no responde— cae a la imagen original del
  // sitio, que vive en el repositorio.
  const image = await getSiteMediaImage("home.hero");
  return (
    <section className="border-b border-stone bg-cream">
      <Container width="wide" className="lg:px-0">
        <div className="grid items-stretch lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="flex flex-col justify-center py-14 lg:py-24 lg:pr-14 lg:pl-12">
            <Eyebrow className="leading-[1.9]">{site.tagline}</Eyebrow>

            <h1 className="mt-7 font-display text-[clamp(2.35rem,4.6vw,3.75rem)] leading-[1.04] text-ink uppercase">
              Más que carros,
              <br />
              es un estilo de vida.
            </h1>

            <Rule className="mt-9" />

            <p className="mt-7 max-w-md font-serif text-[1.125rem] leading-[1.7] text-ink-soft">
              Vehículos que vale la pena mirar. Información clara, buen
              criterio y una experiencia a la altura.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <InventoryCTALink size="lg">
                Ver inventario
                <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
              </InventoryCTALink>
              <ButtonLink href="/contacto" variant="outline" size="lg">
                Contáctanos
              </ButtonLink>
            </div>

            <p className="eyebrow mt-14 hidden text-ink-muted/70 lg:block">
              {site.signature}
            </p>
          </div>

          <div className="relative order-first aspect-[4/3] w-full overflow-hidden bg-charcoal sm:aspect-[16/10] lg:order-none lg:aspect-auto lg:min-h-[36rem]">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority
              // `sizes` no puede ser el ancho del hueco: con object-cover la
              // fotografía se amplía hasta cubrirlo, y en un marco más alto
              // que ella eso significa pedir bastante más ancho del que ocupa.
              // Los valores salen de esa cuenta con una foto 16:9; quedarse en
              // el ancho del hueco es lo que hacía que el navegador eligiera
              // una variante pequeña y se viera blanda.
              sizes="(min-width: 1024px) 75vw, (min-width: 640px) 115vw, 135vw"
              quality={90}
              className="object-cover"
              // El encuadre se elige en /admin/contenido. Sin fila o con un
              // valor ilegible cae al centro, que es como se veía el sitio
              // antes de que esto existiera.
              style={{ objectPosition: objectPosition(image.focal) }}
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
