import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Rule } from "@/components/ui/Rule";

/**
 * Mode change, not another chapter: the story is over and the product
 * starts. Burgundy, not black, so it reads as a continuation of House of
 * Motor Culture rather than a new dark section competing with it.
 */
export function InventoryIntro() {
  return (
    <section className="bg-burgundy">
      <Container width="wide">
        <div className="py-14 lg:py-20">
          <Rule
            data-reveal="rule"
            className="bg-cream/25"
          />
          <Eyebrow className="mt-7 text-cream/55" data-reveal data-reveal-delay="1">
            El inventario de hoy
          </Eyebrow>
          <p
            data-reveal
            data-reveal-delay="2"
            className="mt-5 max-w-3xl font-display text-[clamp(1.625rem,3.4vw,2.5rem)] leading-[1.18] text-cream"
          >
            Eso es hacia dónde vamos.
            <br />
            Esto es lo que tenemos hoy.
          </p>
        </div>
      </Container>
    </section>
  );
}
