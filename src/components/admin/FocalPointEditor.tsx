"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import {
  coverCropRect,
  focalAfterCropDrag,
  focalAfterKey,
  objectPosition,
  type FocalPoint,
} from "@/lib/focal-point";
import type { SiteMediaFrames } from "@/lib/site-media";

type View = "desktop" | "mobile";

/**
 * Elegir qué parte de una fotografía se ve cuando la página la recorta.
 *
 * Se enseña la fotografía **entera** y encima un recuadro con lo que
 * sobrevive al marco; el resto se oscurece. La versión anterior hacía lo
 * contrario —mover la foto por detrás de una ventana— y tenía un problema
 * de fondo: no se veía lo que se estaba dejando fuera, así que era
 * imposible saber si se cortaba una rueda o el techo hasta abrir la home.
 *
 * Sigue sin recortar nada. El recuadro es una representación exacta de lo
 * que hará `object-fit: cover` con el `object-position` que se guarda, y el
 * archivo original se queda intacto en Storage.
 */
export function FocalPointEditor({
  src,
  alt,
  frames,
  focal,
  onChange,
  onNatural,
  unoptimized = false,
  disabled = false,
}: {
  src: string;
  alt: string;
  frames: SiteMediaFrames;
  focal: FocalPoint;
  onChange: (focal: FocalPoint) => void;
  /** El tamaño real del archivo, en cuanto se conoce. */
  onNatural?: (size: { width: number; height: number }) => void;
  unoptimized?: boolean;
  disabled?: boolean;
}) {
  const [view, setView] = useState<View>("desktop");
  const [dragging, setDragging] = useState(false);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(
    null,
  );

  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startFocal: FocalPoint;
    displayed: { width: number; height: number };
  } | null>(null);

  const ratio = frames[view].ratio;
  // Hasta que la fotografía carga no se sabe su proporción; se asume la del
  // marco para que el recuadro nazca ocupándolo todo en vez de dar un salto.
  const image = natural ?? { width: ratio, height: 1 };
  const rect = coverCropRect(image, ratio, focal);
  const movable = rect.width < 1 || rect.height < 1;

  function beginDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled || !natural || !movable) return;
    const stage = stageRef.current;
    if (!stage) return;

    const box = stage.getBoundingClientRect();
    stage.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startFocal: focal,
      displayed: { width: box.width, height: box.height },
    };
    setDragging(true);
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId || !natural) return;
    onChange(
      focalAfterCropDrag(
        natural,
        ratio,
        current.startFocal,
        { dx: event.clientX - current.startX, dy: event.clientY - current.startY },
        current.displayed,
      ),
    );
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    stageRef.current?.releasePointerCapture(event.pointerId);
    drag.current = null;
    setDragging(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const next = focalAfterKey(focal, event.key, event.shiftKey);
    if (!next) return;
    event.preventDefault();
    onChange(next);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="label-caps text-ink-soft">Encuadre</p>

        <div
          role="group"
          aria-label="Vista previa"
          className="inline-flex rounded-xs border border-stone"
        >
          {(["desktop", "mobile"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => setView(option)}
              className={cn(
                "label-caps px-3 py-1.5 text-[10px] transition-colors",
                view === option
                  ? "bg-burgundy text-cream"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {frames[option].label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-2 text-xs text-ink-muted">
        {movable
          ? "Arrastra el recuadro para elegir qué parte se muestra en la página. Lo oscurecido no se verá."
          : "Esta fotografía encaja exacta en el marco: se ve entera y no hay nada que encuadrar."}
      </p>

      {/* El escenario se ajusta a la proporción de la fotografía para que se
          vea completa, sin bandas ni recortes. */}
      <div
        ref={stageRef}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ aspectRatio: natural ? `${natural.width} / ${natural.height}` : "16 / 10" }}
        className={cn(
          "relative mt-3 w-full overflow-hidden bg-sand select-none",
          disabled ? "opacity-60" : movable ? "touch-none" : undefined,
        )}
      >
        <Image
          key={src}
          src={src}
          alt={alt}
          fill
          draggable={false}
          unoptimized={unoptimized}
          quality={90}
          sizes="(min-width: 1024px) 45vw, 90vw"
          onLoad={(event) => {
            const img = event.currentTarget;
            const size = { width: img.naturalWidth, height: img.naturalHeight };
            setNatural(size);
            onNatural?.(size);
          }}
          className="object-contain"
        />

        {/* El recuadro. El `box-shadow` gigante oscurece todo lo que queda
            fuera con un solo elemento: cuatro overlays haría falta mantener
            sincronizados y se les ven las costuras en los bordes. */}
        <div
          role="group"
          tabIndex={disabled || !movable ? -1 : 0}
          aria-label={`Zona visible en la vista de ${frames[view].label.toLowerCase()}. Arrastra el recuadro, o muévelo con las flechas del teclado; mantén Shift para avanzar más rápido.`}
          onKeyDown={onKeyDown}
          style={{
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.width * 100}%`,
            height: `${rect.height * 100}%`,
          }}
          className={cn(
            "absolute outline-none",
            "shadow-[0_0_0_9999px_rgba(20,17,15,0.55)]",
            "ring-1 ring-cream/90",
            "focus-visible:ring-2 focus-visible:ring-burgundy",
            movable && !disabled && (dragging ? "cursor-grabbing" : "cursor-grab"),
          )}
        >
          {/* Cuatro marcas de esquina, discretas. */}
          {(
            [
              "left-0 top-0 border-l border-t",
              "right-0 top-0 border-r border-t",
              "left-0 bottom-0 border-l border-b",
              "right-0 bottom-0 border-r border-b",
            ] as const
          ).map((corner) => (
            <span
              key={corner}
              aria-hidden
              className={cn("absolute size-3.5 border-cream", corner)}
            />
          ))}
        </div>
      </div>

      {/* El resultado, para no tener que imaginárselo: el mismo recorte que
          hará la página, al tamaño de una miniatura. */}
      <div className="mt-4">
        <p className="label-caps text-ink-muted">Resultado en la página</p>
        <div
          style={{ aspectRatio: String(ratio) }}
          className="relative mt-2 w-40 max-w-full overflow-hidden bg-sand"
        >
          <Image
            key={`result-${src}`}
            src={src}
            alt=""
            fill
            unoptimized={unoptimized}
            quality={90}
            sizes="180px"
            className="object-cover"
            style={{ objectPosition: objectPosition(focal) }}
          />
        </div>
      </div>
    </div>
  );
}
