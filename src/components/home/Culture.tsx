import { SiteMediaPicture } from "@/components/media/SiteMediaPicture";
import { TextLink } from "@/components/ui/Arrow";
import { site } from "@/data/site";
import { getSiteMediaImage } from "@/server/site-media/service";
import { REVEAL, REVEAL_IMAGE } from "@/lib/reveal";

/**
 * Hacia dónde va MILLE más allá de la vitrina: salir a rodar, encontrarse.
 * No promete fechas ni eventos que no existen —lo dice: todavía se está
 * construyendo— y manda a Instagram, que es donde se sigue lo que viene.
 *
 * La fotografía se administra desde /admin/contenido.
 */
export async function Culture() {
  const image = await getSiteMediaImage("home.about.future");

  return (
    <section id="cultura" className="section-y scroll-mt-header bg-cream text-ink">
      <div className="wrap">
        <div className="mb-[clamp(2.5rem,5vw,4.5rem)] grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-end lg:gap-[8vw]">
          <h2 className="text-title" {...REVEAL}>
            También nos vemos
            <br className="hidden sm:block" /> fuera del garaje.
          </h2>
          <p
            className="max-w-96 pb-2 text-[1.25rem] leading-snug lg:justify-self-end"
            {...REVEAL}
            style={{ "--d": "120ms" } as React.CSSProperties}
          >
            Hay mucho que queremos hacer con MILLE. Y empieza por salir a
            rodar.
          </p>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1fr] lg:gap-[12vw]">
          <figure className="max-w-140">
            <div
              className="relative aspect-4/5 overflow-hidden rounded-xl bg-charcoal"
              {...REVEAL_IMAGE}
              style={{ "--reveal-radius": "0.875rem" } as React.CSSProperties}
            >
              <SiteMediaPicture
                image={image}
                sizes="(min-width: 1024px) 38vw, 92vw"
                quality={90}
                className="photo-grade object-cover"
              />
            </div>
          </figure>

          <div className="max-w-116">
            <h3
              className="text-[clamp(2.25rem,2.4vw+1.2rem,4.25rem)] leading-[1.1] tracking-[-0.01em]"
              {...REVEAL}
            >
              El plan es encontrarnos.
            </h3>
            <div className="mt-8 space-y-5 text-[1.25rem] leading-[1.5]">
              <p {...REVEAL} style={{ "--d": "80ms" } as React.CSSProperties}>
                Una ruta el domingo. Un día de pista. Sentarnos a hablar de un
                proyecto que todavía está en el garaje.
              </p>
              <p {...REVEAL} style={{ "--d": "140ms" } as React.CSSProperties}>
                Drive, Track, Meet, Build y Wear son las ideas que queremos
                llevar a la calle. Aún estamos construyéndolas.
              </p>
            </div>
            {site.instagram ? (
              <div
                className="mt-9 text-burgundy"
                {...REVEAL}
                style={{ "--d": "200ms" } as React.CSSProperties}
              >
                <TextLink href={site.instagram.url} external>
                  Sigue lo que viene
                </TextLink>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
