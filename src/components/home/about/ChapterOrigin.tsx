import Image from "next/image";
import { ChapterLabel } from "@/components/ui/ChapterLabel";
import { Container } from "@/components/ui/Container";

/** 01 — Full-bleed split. The photograph carries as much weight as the text. */
export function ChapterOrigin() {
  return (
    <div className="border-t border-stone">
      <Container width="wide" className="lg:px-0">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-stretch lg:gap-16">
          <div className="pt-14 lg:py-24 lg:pl-12">
            <ChapterLabel number="01" title="Por qué estamos aquí" />
            <p className="mt-8 max-w-[32rem] font-display text-[clamp(1.625rem,3vw,2.25rem)] leading-[1.18] text-ink">
              Antes de ser una marca, MILLE fue una conversación que nunca se
              acababa.
            </p>
            <div className="mt-7 max-w-[31rem] space-y-5 font-serif text-[1.0625rem] leading-[1.8] text-ink-soft">
              <p>
                Pasa un carro y los dos volteamos. A veces nos devolvemos a
                mirarlo otra vez. Discutimos la versión, el motor, los rines,
                si ese precio tenía sentido, cuál nos llevaríamos y cuál no.
                Podemos seguir en eso una hora larga.
              </p>
              <p>
                Nunca fue por trabajo. Ninguno de los dos vendía carros.
                Simplemente nos gustan.
              </p>
              <p>
                MILLE empezó el día en que nos preguntamos qué pasaría si esa
                conversación dejara de ser solo nuestra.
              </p>
            </div>
            <p className="label-caps mt-9 text-ink-muted">
              David Hernández y Nicolás Henao
            </p>
          </div>

          <div className="relative aspect-[4/3] w-full overflow-hidden bg-charcoal lg:aspect-auto lg:h-full lg:min-h-[32rem]">
            <Image
              src="/images/vehicles/audi-rs-5-sportback/01.jpg"
              alt="Audi RS 5 Sportback en carretera entre árboles de otoño"
              fill
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </Container>
    </div>
  );
}
