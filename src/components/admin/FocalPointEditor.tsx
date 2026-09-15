"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import {
  coverOverflow,
  focalAfterDrag,
  focalAfterKey,
  objectPosition,
  type FocalPoint,
} from "@/lib/focal-point";
import type { SiteMediaFrames } from "@/lib/site-media";

type View = "desktop" | "mobile";

/**
 * Elegir qué parte de una fotografía se ve cuando la página la recorta.
 *
 * No recorta nada: el archivo original se queda como está y aquí solo se
 * decide el `object-position`. Por eso se puede cambiar de opinión mil veces
 * sin volver a subir la imagen.
 *
 * El marco no es un cuadrado de adorno. Cada slot se dibuja con la proporción
 * real que tiene en la página, y se puede alternar entre escritorio y
 * teléfono porque los dos recortes son distintos —el de House of Motor
 * Culture pasa de apaisado a casi cuadrado— y el encuadre guardado es uno
 * solo para ambos. Ver los dos es la única forma de encontrar una posición
 * que aguante en los dos sitios.
 */
export function FocalPointEditor({
  src,
  alt,
  frames,
  focal,
  onChange,
  unoptimized = false,
  disabled = false,
}: {
  src: string;
  alt: string;
  frames: SiteMediaFrames;
  focal: FocalPoint;
  onChange: (focal: FocalPoint) => void;
  unoptimized?: boolean;
  disabled?: boolean;
}) {
  const [view, setView] = useState<View>("desktop");
  const [dragging, setDragging] = useState(false);

  const frameRef = useRef<HTMLDivElement>(null);
  /** El tamaño real del archivo. Sin él no se sabe cuánto sobra del marco. */
  const natural = useRef<{ width: number; height: number } | null>(null);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startFocal: FocalPoint;
    overflow: { x: number; y: number };
  } | null>(null);

  const frame = frames[view];

  function beginDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled || !natural.current) return;
    const element = frameRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const overflow = coverOverflow(
      { width: rect.width, height: rect.height },
      natural.current,
    );
    // Si la fotografía encaja exacta en el marco no hay nada que recorrer, y
    // fingir que se puede arrastrar sería mentirle a quien la mueve.
    if (overflow.x <= 0 && overflow.y <= 0) return;

    element.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startFocal: focal,
      overflow,
    };
    setDragging(true);
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    onChange(
      focalAfterDrag(
        current.startFocal,
        { dx: event.clientX - current.startX, dy: event.clientY - current.startY },
        current.overflow,
      ),
    );
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    frameRef.current?.releasePointerCapture(event.pointerId);
    drag.current = null;
    setDragging(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const next = focalAfterKey(focal, event.key, event.shiftKey);
    if (!next) return;
    // Las flechas mueven la fotografía, no la página.
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
        Arrastra la imagen para elegir qué parte se muestra en la página.
      </p>

      {/* El ancho se limita en la vista de teléfono para que el marco se
          parezca a un teléfono y no a un cartel estrecho y gigante. */}
      <div className={cn("mt-3", view === "mobile" && "max-w-[19rem]")}>
        <div
          ref={frameRef}
          tabIndex={disabled ? -1 : 0}
          role="group"
          aria-label={`Encuadre de la imagen en la vista de ${frame.label.toLowerCase()}. Arrastra la fotografía, o muévela con las flechas del teclado; mantén Shift para avanzar más rápido.`}
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          style={{ aspectRatio: String(frame.ratio) }}
          className={cn(
            "relative w-full overflow-hidden bg-sand outline-none select-none",
            "touch-none", // el arrastre no debe desplazar la página
            "focus-visible:ring-2 focus-visible:ring-burgundy/60",
            disabled
              ? "cursor-default opacity-60"
              : dragging
                ? "cursor-grabbing"
                : "cursor-grab",
          )}
        >
          <Image
            key={src}
            src={src}
            alt={alt}
            fill
            draggable={false}
            unoptimized={unoptimized}
            sizes="(min-width: 1024px) 40vw, 90vw"
            onLoad={(event) => {
              const img = event.currentTarget;
              natural.current = {
                width: img.naturalWidth,
                height: img.naturalHeight,
              };
            }}
            className="object-cover"
            style={{ objectPosition: objectPosition(focal) }}
          />

          {/* El punto de foco, discreto: un aro de crema con corazón
              vinotinto que se lee sobre cualquier fotografía sin convertir
              esto en una herramienta técnica. */}
          <span
            aria-hidden
            style={{ left: `${focal.x}%`, top: `${focal.y}%` }}
            className={cn(
              "pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full",
              "border border-cream/80 shadow-[0_0_0_1px_rgba(20,17,15,0.25)] transition-opacity",
              dragging ? "opacity-100" : "opacity-70",
            )}
          >
            <span className="absolute inset-[6px] rounded-full bg-burgundy" />
          </span>
        </div>
      </div>
    </div>
  );
}
