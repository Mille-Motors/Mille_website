import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * Entry to the story, not a section of its own: short, and it dissolves as
 * the first chapter arrives (see `.story-open` in globals.css).
 */
export function AboutOpening() {
  return (
    <Container width="wide">
      <div className="story-open grid gap-8 py-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end lg:gap-16 lg:py-20">
        <div>
          <Eyebrow>Sobre MILLE</Eyebrow>
          <h2 className="mt-6 font-display text-[clamp(2.125rem,4.6vw,3.375rem)] leading-[1.05] text-ink uppercase">
            Nacimos por los carros.
            <br />
            Queremos llegar mucho más lejos.
          </h2>
        </div>
        <div className="lg:pb-2">
          <span aria-hidden className="block h-px w-16 bg-burgundy/60" />
          <p className="mt-6 max-w-sm font-serif text-[1.0625rem] leading-[1.75] text-ink-soft">
            MILLE es un proyecto que apenas empieza. Esta es la historia de
            por qué existe y hacia dónde queremos llevarlo.
          </p>
        </div>
      </div>
    </Container>
  );
}
