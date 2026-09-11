import Image from "next/image";
import { ArrowRight, Crown, Gem, Handshake } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";

const principles = [
  {
    icon: Gem,
    title: "Selección",
    subtitle: "con criterio",
  },
  {
    icon: Handshake,
    title: "Confianza",
    subtitle: "y transparencia",
  },
  {
    icon: Crown,
    title: "Una experiencia",
    subtitle: "excepcional",
  },
];

export function BrandBlock() {
  return (
    <section id="mille" className="scroll-mt-20 border-b border-stone bg-cream">
      <Container width="wide" className="lg:px-0">
        <div className="grid items-stretch lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-charcoal lg:aspect-auto lg:min-h-[32rem]">
            <Image
              src="/images/brand/interior.jpg"
              alt="Detalle de tapicería en cuero de uno de los vehículos de MILLE"
              fill
              sizes="(min-width: 1024px) 42vw, 100vw"
              className="object-cover"
            />
          </div>

          <div className="grid gap-12 py-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-14 lg:py-20 lg:pr-12 lg:pl-14">
            <div>
              <Eyebrow>Más que vehículos</Eyebrow>
              <h2 className="mt-6 font-display text-[clamp(2rem,4.4vw,3rem)] leading-[1.06] text-ink uppercase">
                Una forma
                <br />
                de vida.
              </h2>
              <p className="mt-8 max-w-lg font-serif text-[1.0625rem] leading-[1.75] text-ink-soft">
                En MILLE creemos que un gran automóvil no solo te lleva más
                lejos, también refleja quién eres. Por eso seleccionamos
                vehículos extraordinarios para personas extraordinarias.
              </p>
              <ButtonLink href="/contacto" variant="outline" size="lg" className="mt-10">
                Conoce más sobre MILLE
                <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
              </ButtonLink>
            </div>

            <ul className="flex flex-col justify-center gap-8 lg:border-l lg:border-stone lg:pl-14">
              {principles.map(({ icon: Icon, title, subtitle }) => (
                <li key={title} className="flex items-center gap-4">
                  <Icon
                    aria-hidden
                    strokeWidth={1.1}
                    className="size-7 shrink-0 text-burgundy"
                  />
                  <p className="font-serif text-[0.9375rem] leading-[1.45] text-ink-soft">
                    {title}
                    <br />
                    {subtitle}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
