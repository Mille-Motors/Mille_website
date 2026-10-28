import { SiteMediaPicture } from "@/components/media/SiteMediaPicture";
import { getSiteMediaImage } from "@/server/site-media/service";
import { REVEAL, REVEAL_IMAGE, TONE_ZONE } from "@/lib/reveal";

/**
 * Dónde la sección pasa a dos columnas: 744 px, el iPad mini en vertical.
 * Va antes que el `md` del sitio (768) porque desde ahí ya cabe el texto al
 * lado de la fotografía. Es local a esta sección: la variante de la
 * fotografía cambia en el mismo ancho que la composición, y ninguna otra
 * fotografía del sitio se entera. Las clases `min-[46.5rem]:` de abajo
 * tienen que decir lo mismo; Tailwind solo lee literales.
 */
const TWO_COLUMNS_PX = 744;

/**
 * La historia de MILLE, en primera persona: de dónde viene y por qué
 * existe. Una sola sección en lugar de una cadena de capítulos.
 *
 * Es una zona de tono: llega oscura, como la sección de vehículos que la
 * precede, y se aclara a crema al entrar en pantalla. Desde tablet, el texto
 * va a la izquierda y la fotografía a la derecha, centrada respecto a él; en
 * teléfono, la fotografía va debajo de la firma.
 *
 * La fotografía se administra desde /admin/contenido, con una variante y un
 * encuadre propios para teléfono.
 */
export async function Story() {
  const image = await getSiteMediaImage("home.about.origin");

  return (
    <section
      id="mille"
      {...TONE_ZONE}
      className="section-y scroll-mt-header bg-cream text-ink"
    >
      <div className="wrap grid items-center gap-[clamp(2.5rem,6vw,8rem)] min-[46.5rem]:grid-cols-2">
        <div>
          <h2 className="text-title mb-[clamp(2rem,4vw,3.5rem)]" {...REVEAL}>
            Una pasión que se volvió un proyecto.
          </h2>
          <div className="max-w-144">
            <p
              className="tone-lead text-[clamp(1.5rem,1vw+1.1rem,2.25rem)] leading-[1.25]"
              {...REVEAL}
            >
              MILLE Motor Culture nació de algo que siempre hemos compartido:
              nuestro amor por los carros.
            </p>
            <div className="mt-8 space-y-5 text-[1.125rem] leading-[1.65] lg:text-[1.25rem]">
              <p {...REVEAL} style={{ "--d": "80ms" } as React.CSSProperties}>
                Somos David Hernández y Nicolás Henao y desde que tenemos
                memoria los carros han sido parte de nuestras vidas. Siempre
                nos ha gustado conocer nuevos modelos, hablar de motores,
                descubrir los detalles que hacen especial a cada vehículo y
                pasar horas conversando sobre este mundo sin aburrirnos.
              </p>
              <p {...REVEAL} style={{ "--d": "120ms" } as React.CSSProperties}>
                Con los años, ese gusto fue creciendo. Empezamos a
                interesarnos cada vez más por las historias detrás de las
                marcas, el diseño, la ingeniería y las personas que comparten
                esta misma pasión. Nos dimos cuenta de que lo que realmente
                nos gusta es toda la cultura que existe alrededor de los
                carros.
              </p>
              <p {...REVEAL} style={{ "--d": "160ms" } as React.CSSProperties}>
                Y así nació MILLE. Queríamos hacer algo propio con esa pasión
                y decidimos empezar ayudando a las personas a vender sus
                carros y motos. Creamos una vitrina donde cada vehículo
                pudiera presentarse con el cuidado que merece y llegar a
                quienes están buscando el próximo.
              </p>
              <p {...REVEAL} style={{ "--d": "200ms" } as React.CSSProperties}>
                Pero desde el principio nuestra idea ha sido ir más allá de la
                compra y venta. Queremos que MILLE sea un espacio para conocer
                personas, compartir experiencias y disfrutar de todo lo que
                nos gusta de la cultura motor.
              </p>
              <p {...REVEAL} style={{ "--d": "240ms" } as React.CSSProperties}>
                Hoy estamos dando nuestros primeros pasos y tenemos muchas
                ideas de lo que queremos hacer. Lo más importante para
                nosotros es que MILLE siga creciendo alrededor de lo que nos
                llevó a empezar: el amor por los carros.
              </p>
            </div>
            <p
              className="mt-10 text-base"
              {...REVEAL}
              style={{ "--d": "280ms" } as React.CSSProperties}
            >
              David Hernández y Nicolás Henao
              <span className="tone-muted block">
                Fundadores de MILLE Motor Culture
              </span>
            </p>
          </div>
        </div>

        <figure>
          <div
            // Vertical a dos columnas, para que gane altura sin ensanchar su
            // columna; horizontal en teléfono, para no alargar la página.
            className="relative aspect-5/4 overflow-hidden rounded-xl bg-charcoal min-[46.5rem]:aspect-4/5"
            {...REVEAL_IMAGE}
            style={{ "--reveal-radius": "0.875rem" } as React.CSSProperties}
          >
            <SiteMediaPicture
              image={image}
              breakpointPx={TWO_COLUMNS_PX}
              sizes="(min-width: 744px) 46vw, 92vw"
              quality={90}
              // `.focal-art` cambia de encuadre en 768 px. Entre 744 y 768
              // esta sección ya enseña la fotografía de escritorio, así que
              // también su encuadre; `!` porque `.focal-art` no va en capa.
              className="photo-grade object-cover min-[46.5rem]:[object-position:var(--focal-d,50%_50%)]!"
            />
          </div>
          <figcaption className="tone-muted mt-4 text-[0.9375rem]">
            House of Motor Culture.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
