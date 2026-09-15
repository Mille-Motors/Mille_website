import type { Metadata } from "next";
import { AboutMille } from "@/components/home/about/AboutMille";
import { CategoryBand } from "@/components/home/CategoryBand";
import { FeaturedVehicles } from "@/components/home/FeaturedVehicles";
import { Hero } from "@/components/home/Hero";
import { InventoryIntro } from "@/components/home/InventoryIntro";
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
 * The story runs first and the inventory second, on purpose: the reader
 * should know why MILLE exists before being shown what is for sale.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <AboutMille />
      <InventoryIntro />
      <CategoryBand />
      <FeaturedVehicles />
    </>
  );
}
