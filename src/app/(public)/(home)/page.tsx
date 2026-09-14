import { AboutMille } from "@/components/home/about/AboutMille";
import { CategoryBand } from "@/components/home/CategoryBand";
import { FeaturedVehicles } from "@/components/home/FeaturedVehicles";
import { Hero } from "@/components/home/Hero";
import { InventoryIntro } from "@/components/home/InventoryIntro";

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
