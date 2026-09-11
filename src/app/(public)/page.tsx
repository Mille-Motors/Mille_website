import { BrandBlock } from "@/components/home/BrandBlock";
import { CategoryBand } from "@/components/home/CategoryBand";
import { FeaturedVehicles } from "@/components/home/FeaturedVehicles";
import { Hero } from "@/components/home/Hero";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryBand />
      <FeaturedVehicles />
      <BrandBlock />
    </>
  );
}
