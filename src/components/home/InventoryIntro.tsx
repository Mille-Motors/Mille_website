import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * Mode change, not another chapter: the story is over and the product starts.
 * The dark ground does the separating so no extra copy is needed.
 */
export function InventoryIntro() {
  return (
    <section className="bg-black">
      <Container width="wide">
        <div className="py-14 lg:py-20">
          <Eyebrow className="text-cream/55" data-reveal>
            El inventario de hoy
          </Eyebrow>
          <p
            data-reveal
            data-reveal-delay="1"
            className="mt-7 max-w-3xl font-display text-[clamp(1.625rem,3.4vw,2.5rem)] leading-[1.18] text-cream"
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
