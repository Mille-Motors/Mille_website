import type { Metadata } from "next";
import { DM_Sans, EB_Garamond, Instrument_Serif } from "next/font/google";
import Image from "next/image";
import { ButtonLink, WhatsappButtonLink } from "@/components/ui/Button";
import { WhatsappIcon } from "@/components/ui/BrandIcons";
import { Container } from "@/components/ui/Container";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { InventoryCTALink } from "@/components/vehicle/InventoryCTALink";
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

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});
const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-eb-garamond",
  display: "swap",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export default async function NotFound() {
  // La fotografía se administra desde /admin/contenido. Sin fila —o sin base—
  // cae a la original del repositorio.
  const image = await getSiteMediaImage("error.404");
  return (
    <div
      className={`${instrumentSerif.variable} ${ebGaramond.variable} ${dmSans.variable} flex min-h-dvh flex-col`}
    >
      <Navbar />
      <main className="flex-1">
        <Container width="wide">
          <div className="grid items-center gap-10 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:py-24">
            <div>
              <p className="font-display text-[clamp(5rem,14vw,10rem)] leading-[0.85] text-ink">
                404
              </p>
              <span
                aria-hidden
                className="mt-8 block h-px w-20 bg-burgundy/60"
              />
              <h1 className="mt-8 font-display text-[clamp(1.5rem,3.4vw,2.25rem)] leading-[1.15] text-ink uppercase">
                Parece que esta ruta
                <br />
                no existe.
              </h1>
              <p className="mt-6 max-w-md font-serif text-[1.0625rem] leading-[1.75] text-ink-soft">
                La página que buscas no se encuentra disponible o ha sido
                movida.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <ButtonLink href="/" size="lg">
                  Volver al inicio
                </ButtonLink>
                <InventoryCTALink variant="ghost" size="lg">
                  Ver inventario
                </InventoryCTALink>
                {/* Sin línea provisionada, un botón de WhatsApp inerte en la
                    404 es un callejón sin salida más. */}
                {site.phone ? (
                  <WhatsappButtonLink
                    href={generalWhatsappUrl()}
                    variant="outline"
                    size="lg"
                  >
                    <WhatsappIcon className="size-4" />
                    WhatsApp
                  </WhatsappButtonLink>
                ) : (
                  <ButtonLink href="/contacto" variant="outline" size="lg">
                    Contáctanos
                  </ButtonLink>
                )}
              </div>

              <p className="eyebrow mt-16 leading-[1.9] text-ink-muted/70">
                {site.signature}
              </p>
            </div>

            <div className="relative hidden aspect-[4/3] overflow-hidden bg-charcoal lg:block">
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
                className="object-cover"
                style={{ objectPosition: objectPosition(image.focal) }}
              />
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
