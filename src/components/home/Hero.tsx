import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Rule } from "@/components/ui/Rule";
import { site } from "@/data/site";

export function Hero() {
  return (
    <section className="border-b border-stone bg-cream">
      <Container width="wide" className="lg:px-0">
        <div className="grid items-stretch lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="flex flex-col justify-center py-14 lg:py-24 lg:pr-14 lg:pl-12">
            <Eyebrow className="leading-[1.9]">
              Autos extraordinarios
              <br />
              para personas extraordinarias
            </Eyebrow>

            <h1 className="mt-7 font-display text-[clamp(2.35rem,4.6vw,3.75rem)] leading-[1.04] text-ink uppercase">
              Más que carros,
              <br />
              es un estilo de vida.
            </h1>

            <Rule className="mt-9" />

            <p className="mt-7 max-w-md font-serif text-[1.125rem] leading-[1.7] text-ink-soft">
              Selección curada de vehículos premium en Bogotá. Calidad, criterio
              y una experiencia a la altura.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <ButtonLink href="/vehiculos" size="lg">
                Ver inventario
                <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
              </ButtonLink>
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
              src="/images/brand/hero.jpg"
              alt="BMW M3 con la identidad de MILLE frente a los cerros de Bogotá"
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover object-center"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
