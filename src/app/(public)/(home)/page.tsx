import type { Metadata } from "next";
import { ClosingCta } from "@/components/home/ClosingCta";
import { Culture } from "@/components/home/Culture";
import { FeaturedVehicles } from "@/components/home/FeaturedVehicles";
import { Hero } from "@/components/home/Hero";
import { SellCampaign } from "@/components/home/SellCampaign";
import { Story } from "@/components/home/Story";
import {
  SITE_DESCRIPTION,
  SITE_TITLE,
  canonical,
  socialMetadata,
} from "@/lib/seo";

/**
 * `title.absolute` y no una cadena suelta: la plantilla del layout raíz
 * —`%s | MILLE`— se aplica a cualquier título que declare una página hija, y
 * dejaría la home como "MILLE | Motor Culture | MILLE".
 */
export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: canonical("/"),
  ...socialMetadata({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    path: "/",
  }),
};

/**
 * La portada manda y el producto va primero: una frase, los vehículos, y
 * solo después la historia de por qué existe MILLE. Cada sección tiene su
 * ancla —`#vehiculos`, `#mille`, `#vender`, `#cultura`— porque el menú salta
 * a ellas.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedVehicles />
      <Story />
      <SellCampaign />
      <Culture />
      <ClosingCta />
    </>
  );
}
