import { ChapterLabel } from "@/components/ui/ChapterLabel";
import { Container } from "@/components/ui/Container";

/**
 * 05 — The pause. A different surface, a centred label and one large quote,
 * so this reads as something said out loud rather than another content block.
 */
export function ChapterCulture() {
  return (
    <div className="border-t border-stone bg-sand">
      <Container width="wide">
        <div className="flex flex-col items-center py-24 text-center lg:py-36">
          <ChapterLabel
            number="05"
            title="Cultura antes que catálogo"
            data-reveal
          />

          <blockquote
            data-reveal
            data-reveal-delay="1"
            className="mt-12 max-w-4xl lg:mt-16"
          >
            <p className="font-display text-[clamp(1.75rem,4.6vw,3.25rem)] leading-[1.16] text-ink">
              <span aria-hidden className="text-burgundy">
                &ldquo;
              </span>
              Los carros van y vienen. Lo que queremos construir es una
              comunidad de gente que quiera hacer el camino con nosotros.
              <span aria-hidden className="text-burgundy">
                &rdquo;
              </span>
            </p>
          </blockquote>

          <p
            data-reveal
            data-reveal-delay="2"
            className="label-caps mt-12 text-ink-muted lg:mt-14"
          >
            David &amp; Nicolás
          </p>
        </div>
      </Container>
    </div>
  );
}
