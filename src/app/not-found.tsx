import type { Metadata } from "next";
import Image from "next/image";
import { ButtonArrow, ButtonLink, WhatsappButtonLink } from "@/components/ui/Button";
import { WhatsappIcon } from "@/components/ui/BrandIcons";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { InventoryCTALink } from "@/components/vehicle/InventoryCTALink";
import { WhatsappClickTracker } from "@/components/whatsapp/WhatsappClickTracker";
import { generalWhatsappUrl } from "@/lib/whatsapp";
import { site } from "@/data/site";
import { objectPosition } from "@/lib/focal-point";
import { NOINDEX_ROBOTS } from "@/lib/seo";
import { getSiteMediaImage } from "@/server/site-media/service";

/**
 * Una 404 no es contenido: se sirve en cualquier URL inexistente y no debe
 * competir en el índice con las páginas reales. Sus enlaces sí se siguen —son
 * la salida hacia el inventario—.
 */
export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: NOINDEX_ROBOTS,
};

export default async function NotFound() {
  // La fotografía se administra desde /admin/contenido. Sin fila —o sin base—
  // cae a la original del repositorio.
  const image = await getSiteMediaImage("error.404");
  return (
    <div className="public-site flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="bg-cream py-[clamp(3.5rem,7vw,8rem)]">
          <div className="wrap grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-[7vw]">
            <div>
              <p
                className="hero-rise text-display text-burgundy"
                style={{ "--i": 0 } as React.CSSProperties}
              >
                404
              </p>
              <h1
                className="hero-rise text-heading mt-6"
                style={{ "--i": 1 } as React.CSSProperties}
              >
                Parece que esta ruta
                <br /> no existe.
              </h1>
              <p
                className="hero-rise mt-5 max-w-104 text-[1.25rem] leading-snug text-ink-soft"
                style={{ "--i": 2 } as React.CSSProperties}
              >
                La página que buscas no se encuentra disponible o ha sido
                movida.
              </p>

              <div
                className="hero-rise mt-10 flex flex-wrap gap-3"
                style={{ "--i": 3 } as React.CSSProperties}
              >
                <ButtonLink href="/" size="lg" className="gap-8">
                  Volver al inicio
                  <ButtonArrow />
                </ButtonLink>
                <InventoryCTALink variant="ghost" size="lg">
                  Ver vehículos
                </InventoryCTALink>
                {/* Sin línea provisionada, un botón de WhatsApp inerte en la
                    404 es un callejón sin salida más. */}
                {site.phone ? (
                  <WhatsappButtonLink
                    href={generalWhatsappUrl()}
                    variant="outline"
                    size="lg"
                    data-wa-source="not-found"
                    data-wa-intent="general"
                  >
                    <WhatsappIcon className="size-5" />
                    WhatsApp
                  </WhatsappButtonLink>
                ) : (
                  <ButtonLink href="/contacto" variant="outline" size="lg">
                    Contáctanos
                  </ButtonLink>
                )}
              </div>
            </div>

            <div className="relative hidden aspect-4/3 overflow-hidden rounded-xl bg-charcoal lg:block">
              <Image
                src={image.src}
                // Decorativa: acompaña a un 404 que ya dice todo lo que hay
                // que decir. Describirla solo alargaría el camino de quien usa
                // un lector de pantalla.
                alt=""
                fill
                // Con object-cover el ancho necesario no es el del hueco sino
                // el que resulta de ampliar la foto hasta cubrirlo. Por debajo
                // de lg la imagen no se pinta, así que ahí se pide lo mínimo
                // en vez de un archivo que nadie va a ver.
                sizes="(min-width: 1024px) 60vw, 1px"
                quality={90}
                className="photo-grade object-cover"
                style={{ objectPosition: objectPosition(image.focal) }}
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsappClickTracker />
    </div>
  );
}
