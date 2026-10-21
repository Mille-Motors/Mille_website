"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type TouchEvent } from "react";
import Image, { getImageProps } from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { useDialog } from "@/components/ui/use-dialog";
import { scrollBehaviorFor } from "@/lib/accordion-scroll";
import { cn } from "@/lib/cn";
import { objectPosition } from "@/lib/focal-point";
import { warmOrder } from "@/lib/gallery-warm";
import { VEHICLE_FRAME_CLASS } from "@/lib/vehicle-frame";
import type { VehicleImage } from "@/types/vehicle";

/**
 * La galería de la ficha.
 *
 * Las fotografías de un vehículo son la mitad de la decisión, así que la
 * principal se sirve a calidad 82 y no al 75 por defecto de Next: se ve en los
 * reflejos de la carrocería, que es justo donde el 75 deja bandas. Estuvo en
 * 90, pero con fotos originales de 5 MB cada una pesaba 570–850 KB por foto a
 * pantalla grande, el doble que a 75, y pasar de una a otra se notaba lento.
 * Las miniaturas se quedan en el valor por defecto: a 180 px nadie
 * distingue una cosa de la otra.
 *
 * Mientras se mira una foto, las demás se van trayendo en segundo plano, las
 * más cercanas primero (`useWarmGallery`): al pulsar la flecha la siguiente ya
 * está en el navegador. Sin eso cada foto nueva esperaba a que el servidor la
 * redujera desde su original, de uno a dos segundos.
 *
 * El marco es el horizontal del sitio, 4:3, en los dos tamaños. Esa
 * constancia es la promesa del editor de encuadre: el mismo punto focal en
 * dos marcos distintos enseña dos trozos distintos de la misma fotografía,
 * así que lo elegido en el administrador no podría corresponderse con lo
 * publicado. `objectPosition` es lo que hace que ese encuadre se respete: no
 * hay recorte ni copia nueva, el archivo sigue entero y el navegador decide
 * qué parte enseña.
 *
 * Se maneja con los dedos y con el teclado, y una fotografía se puede
 * ampliar a pantalla completa, donde sí se ve entera. El cambio de una a otra
 * es un fundido: la anterior se queda debajo mientras la nueva aparece, para
 * que nunca haya un parpadeo de fondo entre las dos.
 *
 * Cambiar de fotografía NO mueve la página. La fila de miniaturas se desliza
 * por sí sola —solo ella, en horizontal— para mantener a la activa a la vista;
 * antes lo hacía con `scrollIntoView`, que si la fila quedaba por debajo del
 * borde de la pantalla arrastraba toda la página hacia ella, justo al revés de
 * lo que se quiere: lo que se mira es la fotografía grande. Lo único que sí
 * mueve la página es pulsar una miniatura con la fotografía grande cortada, y
 * entonces va hacia la fotografía.
 */
const HERO_QUALITY = 82;
/** Lo que mide la foto grande en pantalla; las fotos precargadas piden lo mismo. */
const HERO_SIZES = "(min-width: 1536px) 900px, (min-width: 1024px) 58vw, 100vw";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

export function VehicleGallery({
  images,
  name,
}: {
  images: VehicleImage[];
  /** Para los nombres accesibles: "Fotografías de BMW X5". */
  name: string;
}) {
  const total = images.length;
  const [{ index, prev }, setView] = useState<{ index: number; prev: number | null }>({
    index: 0,
    prev: null,
  });
  const [viewer, setViewer] = useState(false);
  const thumbs = useRef<(HTMLButtonElement | null)[]>([]);
  const rail = useRef<HTMLUListElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useWarmGallery(images, index);

  const goTo = (next: number) =>
    setView((view) =>
      next === view.index ? view : { index: next, prev: view.index },
    );
  const go = (delta: number) => goTo((index + delta + total) % total);

  // La fotografía anterior solo hace falta mientras dura el fundido. Un
  // temporizador y no `animationend`: con el movimiento reducido no hay
  // animación y el evento nunca llegaría.
  useEffect(() => {
    if (prev === null) return;
    const timer = window.setTimeout(
      () => setView((view) => ({ ...view, prev: null })),
      360,
    );
    return () => window.clearTimeout(timer);
  }, [prev, index]);

  // La miniatura activa se mantiene a la vista deslizando SOLO la fila, en
  // horizontal. `scrollTo` sobre la fila y no `scrollIntoView` sobre la
  // miniatura: este último también desplaza la página si la fila está fuera de
  // la pantalla, que era el salto incómodo hacia las miniaturas.
  useEffect(() => {
    const list = rail.current;
    const thumb = thumbs.current[index];
    if (!list || !thumb) return;
    list.scrollTo({
      left: Math.max(0, thumb.offsetLeft - (list.clientWidth - thumb.offsetWidth) / 2),
      behavior: scrollBehaviorFor(prefersReducedMotion()),
    });
  }, [index]);

  /**
   * Al elegir una miniatura, la fotografía grande tiene que verse. Si ya está
   * entera en pantalla no pasa nada: la página se queda quieta. Si está
   * cortada por arriba o por abajo, se mueve lo mínimo para mostrarla, y con
   * el margen del header para que no quede tapada por la barra fija.
   */
  const keepFrameInView = () => {
    frame.current?.scrollIntoView({
      block: "nearest",
      behavior: scrollBehaviorFor(prefersReducedMotion()),
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    }
  };

  const onTouchStart = (event: TouchEvent) => {
    const point = event.touches[0];
    touch.current = { x: point.clientX, y: point.clientY };
  };

  const onTouchEnd = (event: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start || total < 2) return;
    const point = event.changedTouches[0];
    const dx = point.clientX - start.x;
    const dy = point.clientY - start.y;
    // Un gesto horizontal claro; un desplazamiento vertical de la página no.
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  };

  return (
    <div>
      <div
        ref={frame}
        role="group"
        aria-roledescription="carrusel"
        aria-label={`Fotografías de ${name}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={cn(
          "group relative scroll-mt-header touch-pan-y overflow-hidden rounded-xl bg-charcoal",
          VEHICLE_FRAME_CLASS,
        )}
      >
        {prev !== null ? (
          <Image
            key={`prev-${images[prev].src}`}
            src={images[prev].src}
            alt=""
            fill
            sizes={HERO_SIZES}
            quality={HERO_QUALITY}
            aria-hidden
            className="object-cover"
            style={{ objectPosition: objectPosition(images[prev].focal) }}
          />
        ) : null}
        <Image
          key={images[index].src}
          src={images[index].src}
          alt={images[index].alt}
          fill
          priority={index === 0}
          quality={HERO_QUALITY}
          sizes={HERO_SIZES}
          className={cn("object-cover", prev !== null && "gallery-in")}
          style={{ objectPosition: objectPosition(images[index].focal) }}
        />

        {/* Toda la fotografía es el botón de ampliar; las flechas van por
            encima y no lo disparan. */}
        <button
          type="button"
          onClick={() => setViewer(true)}
          aria-label="Ver la fotografía a pantalla completa"
          className="absolute inset-0 cursor-zoom-in focus-visible:outline-offset-[-4px]"
        />

        {total > 1 ? (
          <>
            <RoundControl side="left" label="Fotografía anterior" onClick={() => go(-1)}>
              <ChevronLeft aria-hidden className="size-5" strokeWidth={1.4} />
            </RoundControl>
            <RoundControl side="right" label="Fotografía siguiente" onClick={() => go(1)}>
              <ChevronRight aria-hidden className="size-5" strokeWidth={1.4} />
            </RoundControl>
          </>
        ) : null}

        <p
          aria-live="polite"
          className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-dark/75 px-3.5 py-1.5 text-sm leading-none text-cream tabular"
        >
          {index + 1} / {total}
        </p>
        <span
          aria-hidden
          className="pointer-events-none absolute right-4 bottom-4 grid size-10 place-items-center rounded-full bg-dark/75 text-cream"
        >
          <Maximize2 className="size-4" strokeWidth={1.4} />
        </span>
      </div>

      {total > 1 ? (
        <ul
          ref={rail}
          // `relative`: las miniaturas miden su posición contra esta fila.
          className="relative mt-3 flex gap-2.5 overflow-x-auto pt-1 pb-2 scrollbar-none [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, i) => (
            <li key={image.src} className="w-[clamp(5.25rem,11vw,8.5rem)] shrink-0">
              <button
                ref={(node) => {
                  thumbs.current[i] = node;
                }}
                type="button"
                onClick={() => {
                  goTo(i);
                  keepFrameInView();
                }}
                aria-label={`Ver fotografía ${i + 1} de ${total}`}
                aria-current={i === index}
                className={cn(
                  "press relative block aspect-4/3 w-full overflow-hidden rounded-lg bg-charcoal transition-opacity duration-300",
                  i === index
                    ? "opacity-100 ring-2 ring-cream ring-offset-2 ring-offset-dark"
                    : "opacity-55 [@media(hover:hover)]:hover:opacity-100",
                )}
              >
                <Image
                  src={image.src}
                  alt=""
                  fill
                  sizes="136px"
                  className="object-cover"
                  style={{ objectPosition: objectPosition(image.focal) }}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {viewer ? (
        <GalleryViewer
          images={images}
          index={index}
          name={name}
          onChange={goTo}
          onClose={() => setViewer(false)}
        />
      ) : null}
    </div>
  );
}

/**
 * Trae las fotos de la galería en segundo plano, las más cercanas a la que se
 * ve primero.
 *
 * Cada una se pide con EXACTAMENTE la misma dirección que usará la imagen
 * visible: se calcula con `getImageProps`, con los mismos `sizes` y calidad, y
 * el navegador escoge el mismo ancho que escogería para la foto grande. Así la
 * que se pide aquí es la que se encuentra en caché al pulsar la flecha, no una
 * parecida.
 *
 * Van de dos en dos y con prioridad baja, para no competir con la foto que se
 * está mirando ni saturar un teléfono. Quien ahorra datos o tiene una conexión
 * de 2G no paga por fotos que quizá no vea.
 */
function useWarmGallery(images: VehicleImage[], index: number) {
  const warmed = useRef(new Set<string>());

  useEffect(() => {
    if (images.length < 2) return;
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "")) return;

    let cancelled = false;
    const pending = warmOrder(index, images.length)
      .map((position) => images[position])
      .filter((image) => !warmed.current.has(image.src));

    const next = () => {
      if (cancelled) return;
      const image = pending.shift();
      if (!image) return;
      warmed.current.add(image.src);
      const { props } = getImageProps({
        src: image.src,
        alt: "",
        fill: true,
        sizes: HERO_SIZES,
        quality: HERO_QUALITY,
      });
      const probe = new window.Image();
      probe.decoding = "async";
      (probe as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "low";
      // `sizes` y `srcset` antes que `src`: así el navegador elige el candidato
      // con los mismos datos que para la imagen de verdad.
      probe.sizes = props.sizes ?? "";
      probe.srcset = props.srcSet ?? "";
      probe.src = props.src;
      probe.onload = next;
      probe.onerror = next;
    };

    // Un momento de espera: primero lo que se ve.
    const start = window.setTimeout(() => {
      next();
      next();
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, [images, index]);
}

function RoundControl({
  side,
  label,
  onClick,
  children,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "press absolute top-1/2 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-cream/90 text-ink hover:bg-cream sm:size-12",
        side === "left" ? "left-3 sm:left-4" : "right-3 sm:right-4",
      )}
    >
      {children}
    </button>
  );
}

/**
 * La fotografía a pantalla completa y entera, sin recortar. Se cierra con
 * Escape, con la X o tocando fuera de la imagen; se pasa con las flechas del
 * teclado, con los botones o arrastrando.
 */
function GalleryViewer({
  images,
  index,
  name,
  onChange,
  onClose,
}: {
  images: VehicleImage[];
  index: number;
  name: string;
  onChange: (index: number) => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const touch = useRef<number | null>(null);
  const total = images.length;
  const image = images[index];

  useDialog(panel, true, onClose);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "ArrowLeft") onChange((index - 1 + total) % total);
      if (event.key === "ArrowRight") onChange((index + 1) % total);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, total, onChange]);

  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label={`Fotografías de ${name}`}
      className="viewer-in fixed inset-0 z-80 flex flex-col bg-dark text-cream"
    >
      <div className="flex h-16 shrink-0 items-center justify-between px-5 sm:px-8">
        <p className="text-base text-cream/80 tabular">
          {index + 1} / {total}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="press -mr-2 grid size-12 cursor-pointer place-items-center rounded-full hover:bg-cream/10"
        >
          <X aria-hidden className="size-6" strokeWidth={1.3} />
        </button>
      </div>

      <div
        className="relative min-h-0 flex-1"
        onTouchStart={(event) => {
          touch.current = event.touches[0].clientX;
        }}
        onTouchEnd={(event) => {
          const start = touch.current;
          touch.current = null;
          if (start === null || total < 2) return;
          const dx = event.changedTouches[0].clientX - start;
          if (Math.abs(dx) > 45) onChange((index + (dx < 0 ? 1 : -1) + total) % total);
        }}
        // Tocar el fondo, fuera de la fotografía, cierra.
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <Image
          key={image.src}
          src={image.src}
          alt={image.alt}
          fill
          priority
          quality={HERO_QUALITY}
          sizes="100vw"
          className="gallery-in object-contain"
        />

        {total > 1 ? (
          <>
            <button
              type="button"
              onClick={() => onChange((index - 1 + total) % total)}
              aria-label="Fotografía anterior"
              className="press absolute top-1/2 left-3 grid size-12 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-cream/12 hover:bg-cream/25 sm:left-6"
            >
              <ChevronLeft aria-hidden className="size-6" strokeWidth={1.3} />
            </button>
            <button
              type="button"
              onClick={() => onChange((index + 1) % total)}
              aria-label="Fotografía siguiente"
              className="press absolute top-1/2 right-3 grid size-12 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-cream/12 hover:bg-cream/25 sm:right-6"
            >
              <ChevronRight aria-hidden className="size-6" strokeWidth={1.3} />
            </button>
          </>
        ) : null}
      </div>

      <div className="h-6 shrink-0 sm:h-8" />
    </div>
  );
}
