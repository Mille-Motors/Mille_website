import Image from "next/image";
import { ChapterLabel } from "@/components/ui/ChapterLabel";
import { Container } from "@/components/ui/Container";

const directions = [
  { key: "Drive", body: "Rutas · rallies · expediciones" },
  { key: "Track", body: "Track days · autódromo · motorsport" },
  { key: "Meet", body: "Car meets · rodadas · comunidad" },
  { key: "Build", body: "Taller · detailing · proyectos" },
  { key: "Wear", body: "Merchandise · apparel · colaboraciones" },
];

/** 06 — Split the other way round, so the rhythm alternates against 01. */
export function ChapterFuture() {
  return (
    <div className="border-t border-stone">
      <Container width="wide" className="lg:px-0">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-stretch lg:gap-16">
          <div className="pt-14 lg:py-24 lg:pr-12 lg:pl-14">
            <ChapterLabel
              number="06"
              title="Hacia dónde queremos ir"
              data-reveal
            />
            <p
              data-reveal
              data-reveal-delay="1"
              className="mt-8 font-display text-[clamp(1.875rem,3.6vw,2.75rem)] leading-[1.1] text-ink uppercase"
            >
              Esto apenas empieza.
            </p>

            <ul
              data-reveal
              data-reveal-delay="2"
              className="mt-10 border-t border-stone"
            >
              {directions.map((item) => (
                <li
                  key={item.key}
                  className="flex flex-wrap items-baseline gap-x-7 gap-y-1 border-b border-stone py-4"
                >
                  <span className="label-caps w-16 shrink-0 text-burgundy">
                    {item.key}
                  </span>
                  <span className="font-serif text-[0.9375rem] text-ink-soft">
                    {item.body}
                  </span>
                </li>
              ))}
            </ul>

            <div
              data-reveal
              data-reveal-delay="3"
              className="mt-9 flex max-w-lg items-center gap-5"
            >
              <span aria-hidden className="h-px w-10 shrink-0 bg-stone-strong" />
              <p className="font-serif text-[0.9375rem] leading-[1.7] text-ink-muted italic">
                Nada de esto existe todavía. Es el mapa, no el recorrido.
              </p>
            </div>
          </div>

          <div
            data-reveal
            className="relative aspect-[4/3] w-full overflow-hidden bg-charcoal lg:order-first lg:aspect-auto lg:h-full lg:min-h-[32rem]"
          >
            <Image
              src="/images/vehicles/bmw-r-1250-gs-adventure/01.jpg"
              alt="Motociclista en una BMW R 1250 GS Adventure en una carretera de montaña"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </Container>
    </div>
  );
}
