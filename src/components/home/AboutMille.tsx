import Image from "next/image";
import { HouseOfMotorCulture } from "@/components/home/HouseOfMotorCulture";
import { ButtonLink } from "@/components/ui/Button";
import { ChapterLabel } from "@/components/ui/ChapterLabel";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Rule } from "@/components/ui/Rule";

const today = [
  {
    number: "01",
    title: "Curamos",
    body: "Publicamos solo vehículos que nos parecen interesantes y que revisaríamos igual si fueran para nosotros.",
  },
  {
    number: "02",
    title: "Publicamos",
    body: "Fotos cuidadas, especificaciones completas y el precio a la vista. Sin letra menuda.",
  },
  {
    number: "03",
    title: "Conectamos",
    body: "Ponemos en contacto a quien vende con quien está buscando, y respondemos por lo que publicamos.",
  },
  {
    number: "04",
    title: "Acompañamos",
    body: "Resolvemos dudas, coordinamos la cita y seguimos ahí hasta que el carro cambia de manos.",
  },
];

/** Phrases we want to become sayable. None of them is true yet. */
const sayable = [
  "Vi ese carro en MILLE.",
  "Vamos a la rodada de MILLE.",
  "MILLE está en el autódromo este fin de semana.",
  "MILLE armó una ruta 4x4.",
  "Esa chaqueta es de MILLE.",
];

const directions = [
  { key: "Drive", body: "Rutas · rallies · expediciones" },
  { key: "Track", body: "Track days · autódromo · motorsport" },
  { key: "Meet", body: "Car meets · rodadas · comunidad" },
  { key: "Build", body: "Taller · detailing · proyectos" },
  { key: "Wear", body: "Merchandise · apparel · colaboraciones" },
];

export function AboutMille() {
  return (
    <section id="mille" className="scroll-mt-20 border-t border-stone bg-cream">
      {/* Opening */}
      <Container width="wide">
        <div className="py-16 lg:py-24">
          <Eyebrow>Sobre MILLE</Eyebrow>
          <h2 className="mt-7 max-w-4xl font-display text-[clamp(2.125rem,4.8vw,3.5rem)] leading-[1.05] text-ink uppercase">
            Nacimos por los carros.
            <br />
            Queremos llegar mucho más lejos.
          </h2>
          <Rule className="mt-9" />
          <p className="mt-7 max-w-xl font-serif text-[1.125rem] leading-[1.7] text-ink-soft">
            MILLE es un proyecto que apenas empieza. Esto es por qué existe y
            hacia dónde queremos llevarlo.
          </p>
        </div>
      </Container>

      {/* 01 — Por qué estamos aquí */}
      <div className="border-t border-stone">
        <Container width="wide" className="lg:px-0">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <div className="pt-14 lg:py-20 lg:pl-12">
              <ChapterLabel number="01" title="Por qué estamos aquí" />
              <p className="mt-9 max-w-xl font-display text-[clamp(1.625rem,3vw,2.25rem)] leading-[1.18] text-ink">
                Antes de ser una marca, MILLE fue una conversación que nunca se
                acababa.
              </p>
              <p className="mt-7 max-w-lg font-serif text-[1.0625rem] leading-[1.8] text-ink-soft">
                Vemos un carro, paramos, nos devolvemos. Discutimos la versión,
                el motor, los rines, si valía ese precio, cuál compraríamos y
                cuál no. Podemos quedarnos horas en eso, y no porque
                trabajáramos vendiendo carros: simplemente nos gusta.
              </p>
              <p className="mt-5 max-w-lg font-serif text-[1.0625rem] leading-[1.8] text-ink-soft">
                MILLE empezó el día en que nos preguntamos qué pasaría si esa
                conversación dejara de ser solo nuestra.
              </p>
              <p className="label-caps mt-8 text-ink-muted">
                David Hernández y Nicolás Henao
              </p>
            </div>

            <div className="relative aspect-[4/3] w-full overflow-hidden bg-charcoal lg:aspect-[5/4] lg:min-h-[30rem]">
              <Image
                src="/images/vehicles/audi-rs-5-sportback/01.jpg"
                alt="Audi RS 5 Sportback en carretera entre árboles de otoño"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </Container>
      </div>

      {/* 02 — Lo que MILLE es hoy */}
      <div className="border-t border-stone">
        <Container width="wide">
          <div className="py-16 lg:py-24">
            <ChapterLabel number="02" title="Lo que MILLE es hoy" />
            <p className="mt-9 max-w-3xl font-display text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.2] text-ink">
              Hoy somos mucho más pequeños que la visión que tenemos, y está
              bien.
            </p>
            <p className="mt-7 max-w-xl font-serif text-[1.0625rem] leading-[1.8] text-ink-soft">
              MILLE empieza como una vitrina curada de vehículos. Es lo único
              que hacemos por ahora, y preferimos hacerlo bien antes que hacer
              más.
            </p>

            <ul className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-x-0">
              {today.map((item, index) => (
                <li
                  key={item.title}
                  className={
                    index > 0
                      ? "border-t border-stone pt-6 sm:border-t-0 sm:pt-0 lg:border-l lg:border-stone lg:pl-8"
                      : "border-t border-stone pt-6 sm:border-t-0 sm:pt-0 lg:pr-8"
                  }
                >
                  <span className="font-display text-lg text-burgundy tabular">
                    {item.number}
                  </span>
                  <h3 className="mt-3 font-display text-[1.375rem] leading-tight text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-3 font-serif text-[0.9375rem] leading-[1.7] text-ink-soft">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </div>

      {/* 03 — Pero esa nunca fue toda la idea */}
      <div className="border-t border-stone">
        <Container width="wide">
          <div className="grid gap-10 py-16 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:gap-20 lg:py-24">
            <ChapterLabel
              number="03"
              title="Pero esa nunca fue toda la idea"
              className="lg:flex-col lg:items-start lg:gap-5"
            />
            <div>
              <p className="max-w-2xl font-display text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.2] text-ink">
                La compraventa es la puerta de entrada. No el destino.
              </p>
              <p className="mt-7 max-w-2xl font-serif text-[1.0625rem] leading-[1.8] text-ink-soft">
                Lo que queremos construir es una marca que pueda existir con
                naturalidad en frases como estas:
              </p>

              <ul className="mt-9 max-w-2xl divide-y divide-stone border-y border-stone">
                {sayable.map((phrase) => (
                  <li
                    key={phrase}
                    className="py-4 font-display text-[clamp(1.125rem,2.2vw,1.5rem)] leading-snug text-ink-soft"
                  >
                    <span aria-hidden className="mr-3 text-burgundy">
                      &ldquo;
                    </span>
                    {phrase}
                  </li>
                ))}
              </ul>

              <p className="mt-7 max-w-xl font-serif text-[0.9375rem] leading-[1.7] text-ink-muted italic">
                Ninguna se puede decir todavía. En eso estamos.
              </p>
            </div>
          </div>
        </Container>
      </div>

      {/* 04 — House of Motor Culture */}
      <div className="border-t border-stone">
        <Container width="wide">
          <div className="py-16 lg:py-24">
            <ChapterLabel number="04" title="House of Motor Culture" />
            <p className="mt-9 max-w-3xl font-display text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.2] text-ink">
              Queremos convertir MILLE en una casa para la cultura motor.
            </p>
            <p className="mt-7 max-w-2xl font-serif text-[1.0625rem] leading-[1.8] text-ink-soft">
              No una casa nuestra: una donde quepa cualquiera a quien le muevan
              las máquinas. No nos une una marca, ni un tipo de combustible, ni
              un rango de precio. Nos une que nos importe lo que está bien
              hecho.
            </p>
          </div>
        </Container>
        <HouseOfMotorCulture />
      </div>

      {/* 05 — Cultura antes que catálogo */}
      <div className="border-t border-stone">
        <Container width="wide">
          <div className="grid gap-10 py-16 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:gap-20 lg:py-24">
            <ChapterLabel
              number="05"
              title="Cultura antes que catálogo"
              className="lg:flex-col lg:items-start lg:gap-5"
            />
            <div>
              <p className="max-w-2xl font-display text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.2] text-ink">
                Los carros se venden y se van. Lo que queremos que se quede es
                la cultura que construyamos alrededor de ellos.
              </p>
              <p className="mt-7 max-w-2xl font-serif text-[1.0625rem] leading-[1.8] text-ink-soft">
                El inventario de hoy no va a existir en unos años. Preferimos
                que lo que permanezca sea la gente que decidió acompañarnos.
              </p>
            </div>
          </div>
        </Container>
      </div>

      {/* 06 — Hacia dónde queremos ir */}
      <div className="border-t border-stone">
        <Container width="wide" className="lg:px-0">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <div className="pt-14 lg:py-20 lg:pr-12 lg:pl-14">
              <ChapterLabel number="06" title="Hacia dónde queremos ir" />
              <p className="mt-9 font-display text-[clamp(1.875rem,3.6vw,2.75rem)] leading-[1.1] text-ink uppercase">
                Esto apenas empieza.
              </p>

              <ul className="mt-10 divide-y divide-stone border-t border-stone">
                {directions.map((item) => (
                  <li
                    key={item.key}
                    className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-4"
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

              <p className="mt-7 max-w-lg font-serif text-[0.9375rem] leading-[1.7] text-ink-muted italic">
                Nada de esto existe todavía. Es el mapa, no el recorrido.
              </p>
            </div>

            <div className="relative aspect-[4/3] w-full overflow-hidden bg-charcoal lg:order-first lg:aspect-[5/4] lg:min-h-[30rem]">
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

      {/* Cierre */}
      <div className="border-t border-stone">
        <Container width="wide">
          <div className="flex flex-col items-center py-20 text-center lg:py-28">
            <Rule />
            <p className="mt-9 font-display text-[clamp(1.875rem,4.2vw,3rem)] leading-[1.15] text-ink uppercase">
              Different machines.
              <br />
              Same passion.
            </p>
            <p className="eyebrow mt-9 leading-[2] text-ink-muted">
              David Hernández · Nicolás Henao
              <br />
              Bogotá, Colombia
            </p>
            <ButtonLink href="/contacto" variant="outline" size="lg" className="mt-11">
              Escríbenos
            </ButtonLink>
          </div>
        </Container>
      </div>
    </section>
  );
}
