"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { objectPosition } from "@/lib/focal-point";
import { VEHICLE_FRAME_CLASS } from "@/lib/vehicle-frame";
import type { VehicleImage } from "@/types/vehicle";

/**
 * La galería de la ficha.
 *
 * Las fotografías de un vehículo son la mitad de la decisión, así que la
 * principal se sirve a calidad 90 y no al 75 por defecto de Next. La
 * diferencia son unos 130 KB en una foto de 1.800 px y se ve a simple vista
 * en los reflejos de la carrocería, que es justo donde el 75 deja bandas.
 * Las miniaturas se quedan en el valor por defecto: a 180 px nadie
 * distingue una cosa de la otra y son cuatro o más por página.
 *
 * `sizes` describe el hueco REAL: la columna principal ocupa 1.62 de 2.62
 * dentro de un contenedor de 1.480 px, o sea unos 860 px de CSS, que en una
 * pantalla Retina son 1.720 de verdad. Declarar de menos haría que el
 * navegador bajara una variante pequeña y la estirara.
 *
 * El marco es el horizontal del sitio en los dos tamaños. Antes el
 * escritorio usaba 3:2 y el teléfono 4:3, y esa diferencia hacía imposible
 * la promesa del editor de encuadre: el mismo punto focal en dos marcos
 * distintos enseña dos trozos distintos de la misma fotografía, así que lo
 * elegido en el administrador no podía corresponderse con lo publicado.
 *
 * `objectPosition` es lo que hace que ese encuadre se respete. No hay
 * recorte ni copia nueva: el archivo que se sirve sigue siendo el original
 * entero y el navegador decide qué parte enseña.
 */
const HERO_QUALITY = 90;

export function VehicleGallery({ images }: { images: VehicleImage[] }) {
  const [index, setIndex] = useState(0);
  const total = images.length;
  const go = (delta: number) => setIndex((i) => (i + delta + total) % total);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)]">
      <div className={cn("relative overflow-hidden bg-sand", VEHICLE_FRAME_CLASS)}>
        <Image
          key={images[index].src}
          src={images[index].src}
          alt={images[index].alt}
          fill
          priority
          quality={HERO_QUALITY}
          sizes="(min-width: 1536px) 900px, (min-width: 1024px) 60vw, 100vw"
          className="object-cover"
          style={{ objectPosition: objectPosition(images[index].focal) }}
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
                  sizes="(min-width: 1536px) 280px, (min-width: 1024px) 18vw, 24vw"
                  className="object-cover"
                  style={{ objectPosition: objectPosition(image.focal) }}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
