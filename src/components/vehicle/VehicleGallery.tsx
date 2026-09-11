"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { VehicleImage } from "@/types/vehicle";

export function VehicleGallery({ images }: { images: VehicleImage[] }) {
  const [index, setIndex] = useState(0);
  const total = images.length;
  const go = (delta: number) => setIndex((i) => (i + delta + total) % total);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-sand lg:aspect-[3/2]">
        <Image
          key={images[index].src}
          src={images[index].src}
          alt={images[index].alt}
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
        />

        {total > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Imagen anterior"
              className="absolute top-1/2 left-3 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-cream/85 text-ink transition-colors hover:bg-cream"
            >
              <ChevronLeft aria-hidden className="size-5" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Imagen siguiente"
              className="absolute top-1/2 right-3 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-cream/85 text-ink transition-colors hover:bg-cream"
            >
              <ChevronRight aria-hidden className="size-5" strokeWidth={1.5} />
            </button>
          </>
        ) : null}

        <p
          aria-live="polite"
          className="label-caps absolute bottom-3 left-3 bg-black/70 px-2.5 py-1.5 text-[10px] text-cream tabular"
        >
          {index + 1} / {total}
        </p>
      </div>

      {total > 1 ? (
        <ul className="grid grid-cols-4 gap-3 lg:h-full lg:grid-cols-2 lg:grid-rows-2">
          {images.map((image, i) => (
            <li key={image.src} className="lg:min-h-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ver imagen ${i + 1} de ${total}`}
                aria-current={i === index}
                className={cn(
                  "relative block aspect-[4/3] w-full overflow-hidden bg-sand transition-opacity lg:aspect-auto lg:h-full",
                  i === index
                    ? "ring-1 ring-burgundy ring-offset-2 ring-offset-cream"
                    : "opacity-75 hover:opacity-100",
                )}
              >
                <Image
                  src={image.src}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 18vw, 24vw"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
