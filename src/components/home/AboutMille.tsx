import Image from "next/image";
import { AboutMoves } from "@/components/home/AboutMoves";
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

const next = [
  "Rodadas y car meets",
  "Rutas y expediciones 4x4",
  "Track days",
  "Motorsport",
  "Taller y detailing",
  "Merchandise",
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
            MILLE es un proyecto que apenas empieza. Esto es lo que somos hoy y
            lo que estamos construyendo.
          </p>
        </div>
      </Container>

      {/* 01 — Quiénes somos */}
      <div className="border-t border-stone">
        <Container width="wide" className="lg:px-0">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <div className="pt-14 lg:py-20 lg:pl-12">
              <ChapterLabel number="01" title="Quiénes somos" />
              <p className="mt-9 font-display text-[clamp(1.75rem,3.2vw,2.5rem)] leading-[1.15] text-ink">
                David Hernández
                <br />y Nicolás Henao.
              </p>
              <p className="mt-7 max-w-lg font-serif text-[1.0625rem] leading-[1.8] text-ink-soft">
                Dos personas a las que siempre les han gustado los carros. De
                los que se devuelven media cuadra para volver a mirar algo que
                pasó, comparan versiones que no van a comprar y son capaces de
                discutir una configuración durante una hora. MILLE salió de
                ahí: de querer que esa conversación no se quedara entre
                nosotros dos.
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

      {/* 02 — Por qué existe MILLE */}
      <div className="border-t border-stone">
        <Container width="wide">
          <div className="grid gap-10 py-16 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:gap-20 lg:py-24">
            <ChapterLabel
              number="02"
              title="Por qué existe MILLE"
              className="lg:flex-col lg:items-start lg:gap-5"
            />
            <div>
              <p className="max-w-2xl font-display text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.2] text-ink">
                No queríamos montar otro compraventa.
              </p>
              <p className="mt-7 max-w-2xl font-serif text-[1.0625rem] leading-[1.8] text-ink-soft">
                Casi siempre, buscar carro se siente como un trámite: fotos
                apuradas, información incompleta y alguien con afán de cerrar.
                Nos parece que un buen vehículo merece más que eso, y quien lo
                está buscando también.
              </p>
              <p className="mt-5 max-w-2xl font-serif text-[1.0625rem] leading-[1.8] text-ink-soft">
                MILLE existe para que encontrar un carro se parezca un poco más
                a lo que sentimos nosotros cuando damos con uno bueno.
              </p>
            </div>
          </div>
        </Container>
      </div>

      {/* 03 — Lo que hacemos hoy */}
      <div className="border-t border-stone">
        <Container width="wide">
          <div className="py-16 lg:py-24">
            <ChapterLabel number="03" title="Lo que hacemos hoy" />
            <p className="mt-9 max-w-2xl font-display text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.2] text-ink">
              Hoy MILLE es una vitrina curada de vehículos. Nada más, y eso lo
              hacemos bien.
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

      {/* 04 — Todo lo que nos mueve */}
      <AboutMoves />

      {/* 05 — Lo que viene */}
      <div className="border-t border-stone">
        <Container width="wide" className="lg:px-0">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
            <div className="pt-14 lg:py-20 lg:pr-12 lg:pl-14">
              <ChapterLabel number="05" title="Lo que viene" />
              <p className="mt-9 font-display text-[clamp(1.875rem,3.6vw,2.75rem)] leading-[1.1] text-ink uppercase">
                Esto apenas empieza.
              </p>
              <p className="mt-7 max-w-lg font-serif text-[1.0625rem] leading-[1.8] text-ink-soft">
                Vender carros es la primera puerta, no el destino. Queremos que
                MILLE termine siendo un lugar donde se encuentre la gente a la
                que le mueven las máquinas.
              </p>
              <p className="mt-9 label-caps text-ink-muted">
                Hacia dónde queremos llevarlo
              </p>
              <ul className="mt-5 flex flex-wrap gap-x-3 gap-y-2.5">
                {next.map((item) => (
                  <li
                    key={item}
                    className="rounded-xs border border-stone px-3.5 py-2 font-serif text-[0.9375rem] text-ink-soft"
                  >
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-7 max-w-lg font-serif text-[0.9375rem] leading-[1.7] text-ink-muted italic">
                Nada de esto existe todavía. Es el camino que queremos recorrer.
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

      {/* 06 — Cierre */}
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
