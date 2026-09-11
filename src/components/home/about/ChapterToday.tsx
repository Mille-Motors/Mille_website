import { ChapterLabel } from "@/components/ui/ChapterLabel";
import { Container } from "@/components/ui/Container";

/**
 * 02 — An index, not a row of feature cards: hanging numbers, the verb in
 * display serif, the explanation in its own column, hairlines between.
 */
const work = [
  {
    number: "01",
    verb: "Reunimos",
    body: "Vehículos distintos, porque también son distintas las razones para quererlos. Puede ser el carro que alguien soñó durante años, el que marca una nueva etapa o simplemente el que encaja perfecto en su vida.",
  },
  {
    number: "02",
    verb: "Presentamos",
    body: "Fotografías pensadas para que el vehículo se entienda antes de verlo en persona, información clara, precio a la vista y una Ficha Técnica MILLE construida con datos verificables.",
  },
  {
    number: "03",
    verb: "Conectamos",
    body: "Acercamos a quien quiere vender con quien está buscando algo que realmente le haga sentido, y hacemos que el proceso sea claro desde el primer contacto.",
  },
  {
    number: "04",
    verb: "Acompañamos",
    body: "Estamos presentes desde la primera pregunta hasta que las llaves cambian de manos.",
  },
];

export function ChapterToday() {
  return (
    <div className="border-t border-stone bg-paper">
      <Container width="wide">
        <div className="py-16 lg:py-24">
          <ChapterLabel number="02" title="Lo que MILLE es hoy" data-reveal />
          <p
            data-reveal
            data-reveal-delay="1"
            className="mt-8 max-w-3xl font-display text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.2] text-ink"
          >
            Hoy somos mucho más pequeños que la visión que tenemos, y está
            bien.
          </p>
          <p
            data-reveal
            data-reveal-delay="2"
            className="mt-6 max-w-xl font-serif text-[1.0625rem] leading-[1.8] text-ink-soft"
          >
            MILLE empieza como una vitrina de vehículos y de las historias que
            pueden empezar con ellos. Hoy nos enfocamos en mostrarlos bien,
            entenderlos y conectar a las personas correctas. Preferimos
            empezar por ahí y hacerlo bien.
          </p>

          <dl className="mt-12 border-t border-stone lg:mt-16">
            {work.map((item, index) => (
              <div
                key={item.verb}
                data-reveal
                data-reveal-delay={String(Math.min(index + 1, 4))}
                className="grid items-baseline gap-x-8 gap-y-2 border-b border-stone py-7 lg:grid-cols-[auto_minmax(0,15rem)_minmax(0,1fr)] lg:py-8"
              >
                <span className="font-display text-base text-burgundy tabular lg:pt-1.5">
                  {item.number}
                </span>
                <dt className="font-display text-[clamp(1.5rem,2.6vw,2rem)] leading-none text-ink">
                  {item.verb}
                </dt>
                <dd className="max-w-xl font-serif text-[1rem] leading-[1.75] text-ink-soft">
                  {item.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </div>
  );
}
