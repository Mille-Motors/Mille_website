import { AboutClosing } from "@/components/home/about/AboutClosing";
import { AboutOpening } from "@/components/home/about/AboutOpening";
import { ChapterCulture } from "@/components/home/about/ChapterCulture";
import { ChapterFuture } from "@/components/home/about/ChapterFuture";
import { ChapterGateway } from "@/components/home/about/ChapterGateway";
import { ChapterHouse } from "@/components/home/about/ChapterHouse";
import { ChapterOrigin } from "@/components/home/about/ChapterOrigin";
import { ChapterToday } from "@/components/home/about/ChapterToday";

/**
 * The MILLE story. Each chapter is composed differently on purpose — split,
 * index, stepped phrases, plate, quote, split — so reading down does not feel
 * like the same block repeated six times.
 */
export function AboutMille() {
  return (
    <section
      id="mille"
      className="scroll-mt-28 border-t border-stone bg-cream lg:scroll-mt-20"
    >
      <AboutOpening />
      <ChapterOrigin />
      <ChapterToday />
      <ChapterGateway />
      <ChapterHouse />
      <ChapterCulture />
      <ChapterFuture />
      <AboutClosing />
    </section>
  );
}
