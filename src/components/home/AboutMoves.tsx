import { ChapterLabel } from "@/components/ui/ChapterLabel";
import { Container } from "@/components/ui/Container";

/**
 * The one dark band in the story. Everything MILLE is curious about, set as a
 * single typographic composition rather than a grid of cards.
 */
const moves = [
  "Automóviles",
  "Motos",
  "Performance",
  "4x4",
  "Eléctricos",
  "Híbridos",
  "Ingeniería",
  "Diseño",
  "Carretera",
  "Motorsport",
];

export function AboutMoves() {
  return (
    <div className="bg-black">
      <Container width="wide">
        <div className="py-16 lg:py-24">
          <ChapterLabel number="04" title="Todo lo que nos mueve" tone="cream" />

          <p className="mt-8 max-w-2xl font-display text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.2] text-cream">
            No nos interesa un solo tipo de máquina.
          </p>

          <p className="mt-6 max-w-xl font-serif text-[1.0625rem] leading-[1.75] text-cream/65">
            Un 330e nos gusta por razones distintas a un M4, y una GS por otras
            completamente diferentes. Lo que buscamos es que esté bien hecho y
            que tenga algo que contar.
          </p>

          <ul className="mt-12 flex flex-wrap items-baseline gap-x-5 gap-y-3 lg:mt-16 lg:gap-x-7">
            {moves.map((word, index) => (
              <li key={word} className="flex items-baseline gap-5 lg:gap-7">
                <span className="font-display text-[clamp(1.375rem,3.4vw,2.5rem)] leading-tight text-cream/90 uppercase">
                  {word}
                </span>
                {/* Separator trails the word so a wrapped line never opens with it. */}
                {index < moves.length - 1 ? (
                  <span
                    aria-hidden
                    className="size-1 self-center rounded-full bg-burgundy-soft"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </div>
  );
}
