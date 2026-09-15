import Image from "next/image";
import { getSiteMediaImage } from "@/server/site-media/service";
import { objectPosition } from "@/lib/focal-point";
import { Container } from "@/components/ui/Container";
import { site } from "@/data/site";

/**
 * The burgundy plate. Built to read like a piece of brand identity dropped
 * into the page rather than a card: flat colour, hairlines, no shadow.
 * Composition follows the brand board — a run of small-caps words, the mark,
 * the line, the city.
 */
const territory = [
  "Carros",
  "Motos",
  "4x4",
  "Eléctricos",
  "Híbridos",
  "Performance",
  "Motorsport",
  "Ingeniería",
  "Diseño",
  "Carretera",
];

export async function HouseOfMotorCulture() {
  // La fotografía se administra desde /admin/contenido. Si no se ha
  // cambiado nunca —o la base no responde— cae a la imagen original del
  // sitio, que vive en el repositorio.
  const image = await getSiteMediaImage("home.about.house");
  return (
    <Container width="wide" className="lg:px-0">
      <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="flex flex-col items-center bg-burgundy px-6 py-16 text-center sm:px-12 lg:py-20">
          {/* Each separator stays glued to its word, so a wrapped line never
              opens with an orphan dot. */}
          <p className="eyebrow flex max-w-md flex-wrap justify-center gap-x-2 gap-y-1.5 leading-[2] text-cream/45">
            {territory.map((word, index) => (
              <span key={word}>
                {word}
                {index < territory.length - 1 ? " ·" : ""}
              </span>
            ))}
          </p>

          <span aria-hidden className="mt-12 h-px w-12 bg-cream/25" />

          <p className="mt-14 font-display text-[clamp(2.5rem,5vw,3.5rem)] leading-none tracking-[0.22em] text-cream uppercase">
            MILLE
          </p>
          <p className="label-caps mt-5 text-cream/70">House of Motor Culture</p>

          <div className="mt-12 grid gap-2.5">
            {["Máquinas", "Personas", "Historias"].map((word) => (
              <p
                key={word}
                className="font-display text-[clamp(1.25rem,2.2vw,1.625rem)] leading-none tracking-[0.14em] text-cream/85 uppercase"
              >
                {word}
              </p>
            ))}
            <span aria-hidden className="mx-auto my-3 h-px w-8 bg-cream/30" />
            <p className="font-display text-[clamp(1.25rem,2.2vw,1.625rem)] leading-none tracking-[0.14em] text-cream uppercase">
              Un mismo camino
            </p>
          </div>

          {/* Closes the manifesto: the point of the house is the people in it. */}
          <p className="mt-12 max-w-xs font-serif text-[clamp(1rem,1.6vw,1.125rem)] leading-[1.6] text-cream/70 italic">
            La cultura la construimos juntos.
          </p>

          <span aria-hidden className="mt-12 h-px w-12 bg-cream/20" />

          <p className="eyebrow mt-8 text-cream/50">
            {site.city}, {site.country}
          </p>
        </div>

        <div className="relative min-h-[22rem] w-full overflow-hidden bg-charcoal lg:min-h-[38rem]">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="object-cover"
            style={{ objectPosition: objectPosition(image.focal) }}
          />
        </div>
      </div>
    </Container>
  );
}
