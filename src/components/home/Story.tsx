import Image from "next/image";
import { objectPosition } from "@/lib/focal-point";
import { getSiteMediaImage } from "@/server/site-media/service";
import { REVEAL, REVEAL_IMAGE, TONE_ZONE } from "@/lib/reveal";

/**
 * La historia de MILLE, corta y en primera persona: de dónde viene y por qué
 * existe. Una sola sección en lugar de una cadena de capítulos.
 *
 * Es una zona de tono: llega oscura, como la sección de vehículos que la
 * precede, y se aclara a crema al entrar en pantalla. La fotografía sube
 * sobre el titular en escritorio, así que las dos columnas no se leen como
 * una fila de formulario.
 *
 * La fotografía se administra desde /admin/contenido.
 */
export async function Story() {
  const image = await getSiteMediaImage("home.about.origin");

  return (
    <section
      id="mille"
      {...TONE_ZONE}
      className="section-y scroll-mt-header bg-cream text-ink"
    >
      <div className="wrap">
        <h2 className="text-title mb-[clamp(2.5rem,5vw,4rem)]" {...REVEAL}>
          Nos pasa
          <br /> desde siempre.
        </h2>

        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-[10vw]">
          <div className="max-w-116 pt-2">
            <p
              className="tone-lead text-[clamp(1.75rem,1.5vw+1.1rem,2.75rem)] leading-[1.2]"
              {...REVEAL}
            >
              Pasa un carro.
              <br />
              Los dos volteamos.
            </p>
            <div className="mt-8 space-y-5 text-[1.25rem] leading-[1.6]">
              <p {...REVEAL} style={{ "--d": "80ms" } as React.CSSProperties}>
                Después vienen las preguntas: qué motor tiene, qué versión es,
                por qué esos rines. Nos quedamos hablando de un carro que ya
                se fue.
              </p>
              <p {...REVEAL} style={{ "--d": "140ms" } as React.CSSProperties}>
                De esas conversaciones entre David y Nicolás nació MILLE.
                Empezamos con una vitrina para acercar a quienes quieren
                vender su vehículo y a quienes están buscando el próximo.
              </p>
              <p {...REVEAL} style={{ "--d": "200ms" } as React.CSSProperties}>
                Queremos que, con el tiempo, también sea un lugar para
                encontrarnos.
              </p>
            </div>
            <p
              className="mt-10 text-base"
              {...REVEAL}
              style={{ "--d": "260ms" } as React.CSSProperties}
            >
              David Hernández y Nicolás Henao
              <span className="tone-muted block">Fundadores de MILLE</span>
            </p>
          </div>

          <figure className="lg:-mt-32">
            <div
              className="relative aspect-5/4 overflow-hidden rounded-xl bg-charcoal"
              {...REVEAL_IMAGE}
              style={{ "--reveal-radius": "0.875rem" } as React.CSSProperties}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 1024px) 52vw, 92vw"
                quality={90}
                className="photo-grade object-cover"
                style={{ objectPosition: objectPosition(image.focal) }}
              />
            </div>
            <figcaption className="tone-muted mt-4 text-[0.9375rem]">
              House of Motor Culture.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
