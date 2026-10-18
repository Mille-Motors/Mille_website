import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { ButtonArrow } from "@/components/ui/Button";
import { InventoryCTALink } from "@/components/vehicle/InventoryCTALink";
import { objectPosition } from "@/lib/focal-point";
import { getSiteMediaImage } from "@/server/site-media/service";

/**
 * La portada: una fotografía a pantalla completa y una sola frase grande.
 *
 * Sube por debajo de la barra superior (`-mt-header`), que es transparente
 * mientras la página no se ha movido. Todo lo que se mueve aquí es CSS puro:
 * la imagen se asienta, el titular sube desde detrás de su propia línea de
 * base y el resto llega después, para que nada de lo que se ve dependa de
 * que el script haya cargado.
 *
 * La fotografía se administra desde /admin/contenido. Si no se ha cambiado
 * nunca —o la base no responde— cae a la imagen original del sitio, que vive
 * en el repositorio.
 */
export async function Hero() {
  const image = await getSiteMediaImage("home.hero");

  return (
    <section
      data-hero
      className="relative isolate -mt-header flex min-h-svh flex-col overflow-hidden bg-dark text-cream"
    >
      <div className="hero-settle absolute inset-0 -z-10">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          priority
          sizes="100vw"
          quality={90}
          className="hero-grade object-cover"
          style={{ objectPosition: objectPosition(image.focal) }}
        />
      </div>

      {/* Un velo neutro: oscurece el pie de la fotografía para que el texto se
          lea sobre cualquier imagen que se suba. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-b from-dark/30 via-transparent to-dark/65"
      />

      <div className="wrap flex flex-1 flex-col justify-between gap-12 pt-[calc(var(--spacing-header)+clamp(2rem,8svh,6rem))] pb-[max(5.5rem,8svh)] lg:pb-[max(6.75rem,12svh)]">
        <h1 className="hero-lines text-display">
          <span className="line">
            <span style={{ "--i": 0 } as React.CSSProperties}>Nos mueve.</span>
          </span>
        </h1>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <p
            className="hero-rise text-lead max-w-[26ch] text-cream/95"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            Hay carros que te hacen parar. Y conversaciones que empiezan ahí.
          </p>
          <div
            className="hero-rise w-full sm:w-auto"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            <InventoryCTALink
              variant="onDark"
              size="lg"
              className="w-full justify-between gap-10 sm:w-auto"
            >
              Entra a MILLE
              <ButtonArrow />
            </InventoryCTALink>
          </div>
        </div>
      </div>

      <span
        aria-hidden
        className="cue-nudge absolute bottom-3 left-1/2 hidden size-12 -translate-x-1/2 items-center justify-center text-cream/80 lg:flex"
      >
        <ArrowDown className="size-5" strokeWidth={1.3} />
      </span>
    </section>
  );
}
