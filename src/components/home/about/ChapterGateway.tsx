import { ChapterLabel } from "@/components/ui/ChapterLabel";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/cn";

/**
 * 03 — The phrases we want to become sayable. Set large and stepped, so
 * reading down them feels like a sequence rather than a list of rows.
 * None of them is true yet, and the closing line says so.
 */
const sayable = [
  { text: "Vi ese carro en MILLE.", indent: "lg:ml-0" },
  { text: "Vamos a la rodada de MILLE.", indent: "lg:ml-[8%]" },
  { text: "MILLE está en el autódromo este fin de semana.", indent: "lg:ml-[4%]" },
  { text: "MILLE armó una ruta 4x4.", indent: "lg:ml-[14%]" },
  { text: "Esa chaqueta es de MILLE.", indent: "lg:ml-[6%]" },
];

export function ChapterGateway() {
  return (
    <div className="border-t border-stone">
      <Container width="wide">
        <div className="py-16 lg:py-24">
          <ChapterLabel number="03" title="La puerta de entrada" />
          <p className="mt-8 max-w-3xl font-display text-[clamp(1.5rem,3.2vw,2.375rem)] leading-[1.18] text-ink">
            La compraventa es la puerta de entrada. No el destino.
          </p>
          <p className="mt-6 max-w-lg font-serif text-[1.0625rem] leading-[1.8] text-ink-soft">
            Lo que queremos construir es una marca que pueda existir con
            naturalidad en frases como estas.
          </p>

          <ul className="mt-14 space-y-9 lg:mt-20 lg:space-y-12">
            {sayable.map((phrase) => (
              <li
                key={phrase.text}
                className={cn("flex max-w-4xl items-start gap-4", phrase.indent)}
              >
                <span
                  aria-hidden
                  className="mt-1 font-display text-[clamp(1.75rem,3vw,2.5rem)] leading-none text-burgundy"
                >
                  &ldquo;
                </span>
                <span className="font-display text-[clamp(1.375rem,3.4vw,2.5rem)] leading-[1.22] text-ink">
                  {phrase.text}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-16 flex max-w-lg items-center gap-5 lg:mt-20">
            <span aria-hidden className="h-px w-10 shrink-0 bg-stone-strong" />
            <p className="font-serif text-[0.9375rem] leading-[1.7] text-ink-muted italic">
              Ninguna se puede decir todavía. En eso estamos.
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}
