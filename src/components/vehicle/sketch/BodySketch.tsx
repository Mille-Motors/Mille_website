import { useId } from "react";
import { CANVAS, circle } from "@/components/vehicle/sketch/geometry";
import type { Sketch, Wheel } from "@/components/vehicle/sketch/types";

/**
 * El `<svg>` de un boceto.
 *
 * El trazo se mide en píxeles de pantalla (`vector-effect`) y no en unidades
 * del dibujo: un mismo boceto se ve igual de fino a 40 px que a 300, que es lo
 * que se espera de una línea de diseño. Cambiar el tamaño no engorda ni
 * adelgaza nada.
 *
 * Dos presentaciones:
 *  - `plate`: el dibujo entero, para las láminas grandes de la portada.
 *  - `mark`: solo silueta, cristales y neumáticos, para donde mide unos 56 px
 *    y los detalles serían ruido. Sin el aro: a ese tamaño neumático y aro
 *    están a un píxel y se funden en una mancha.
 */
export type SketchVariant = "plate" | "mark";

const WEIGHT = {
  plate: { body: 1.5, glass: 1.1, detail: 0.9, guide: 0.7 },
  mark: { body: 1.5, glass: 1.2, detail: 0, guide: 0 },
} as const;

/** Las ruedas: neumático, aro, buje y radios, con la misma regla en todos. */
function wheelPaths(wheel: Wheel): { body: string; glass: string; detail: string } {
  const { cx, cy, r, rim } = wheel;
  const spokes = wheel.spokes ?? 5;
  const hub = Math.max(rim * 0.26, 1.2);

  const detail: string[] = [circle(cx, cy, hub)];
  for (let i = 0; i < spokes; i += 1) {
    const angle = (i / spokes) * Math.PI * 2 - Math.PI / 2 + 0.31;
    const inner = hub + 0.5;
    const outer = rim * 0.88;
    detail.push(
      `M${(cx + Math.cos(angle) * inner).toFixed(2)} ${(cy + Math.sin(angle) * inner).toFixed(2)}` +
        `L${(cx + Math.cos(angle) * outer).toFixed(2)} ${(cy + Math.sin(angle) * outer).toFixed(2)}`,
    );
  }

  let body = circle(cx, cy, r);
  if (wheel.knobby) {
    // Tacos: una marca corta hacia fuera cada 22 grados.
    const ticks = Math.round(360 / 22);
    for (let i = 0; i < ticks; i += 1) {
      const angle = (i / ticks) * Math.PI * 2;
      body +=
        `M${(cx + Math.cos(angle) * r).toFixed(2)} ${(cy + Math.sin(angle) * r).toFixed(2)}` +
        `L${(cx + Math.cos(angle) * (r + 1.5)).toFixed(2)} ${(cy + Math.sin(angle) * (r + 1.5)).toFixed(2)}`;
    }
  }

  return { body, glass: circle(cx, cy, rim), detail: detail.join("") };
}

export function BodySketch({
  sketch,
  variant = "plate",
  className,
  strokeScale = 1,
}: {
  sketch: Sketch;
  variant?: SketchVariant;
  className?: string;
  /** Multiplica todos los pesos: para las superficies que piden más cuerpo. */
  strokeScale?: number;
}) {
  // Dos bocetos en la misma página no pueden compartir el id de su máscara.
  const maskId = `sk${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const weight = WEIGHT[variant];
  const wheels = sketch.wheels.map(wheelPaths);
  const full = variant === "plate";
  const occluded = (sketch.occlude?.length ?? 0) > 0;

  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };

  return (
    <svg
      viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
      fill="none"
      aria-hidden
      focusable="false"
      className={className}
    >
      {occluded ? (
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x={0}
            y={0}
            width={CANVAS.width}
            height={CANVAS.height}
          >
            <rect width={CANVAS.width} height={CANVAS.height} fill="white" />
            <path d={sketch.occlude!.join("")} fill="black" stroke="black" strokeWidth={0.6} />
          </mask>
        </defs>
      ) : null}

      {full ? (
        <path
          d={sketch.guide.join("")}
          {...common}
          strokeWidth={weight.guide * strokeScale}
          strokeDasharray="2 3"
          opacity={0.5}
        />
      ) : null}

      {/* Las ruedas van aparte porque son lo único que las formas de
          `occlude` esconden en parte. */}
      <g mask={occluded ? `url(#${maskId})` : undefined}>
        {full ? (
          <path
            d={wheels.map((w) => w.detail).join("")}
            {...common}
            strokeWidth={weight.detail * strokeScale}
            opacity={0.85}
          />
        ) : null}
        {full ? (
          <path
            d={wheels.map((w) => w.glass).join("")}
            {...common}
            strokeWidth={weight.glass * strokeScale}
          />
        ) : null}
        <path
          d={wheels.map((w) => w.body).join("")}
          {...common}
          strokeWidth={weight.body * strokeScale}
        />
      </g>

      {full ? (
        <path
          d={sketch.detail.join("")}
          {...common}
          strokeWidth={weight.detail * strokeScale}
          opacity={0.85}
        />
      ) : null}
      <path
        d={sketch.glass.join("")}
        {...common}
        strokeWidth={weight.glass * strokeScale}
      />
      <path
        d={sketch.body.join("")}
        {...common}
        strokeWidth={weight.body * strokeScale}
      />
    </svg>
  );
}
