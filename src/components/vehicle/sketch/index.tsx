import { BodySketch, type SketchVariant } from "@/components/vehicle/sketch/BodySketch";
import { canonicalBodySlug } from "@/lib/body-types";
import { carSketches } from "@/components/vehicle/sketch/cars";
import { motoSketches } from "@/components/vehicle/sketch/motos";
import { SKETCH_KEYS, type Sketch, type SketchKey } from "@/components/vehicle/sketch/types";
import type { VehicleType } from "@/types/vehicle";

/**
 * El dibujo de cada categoría.
 *
 * La clave de un boceto es el slug de la categoría, tal como lo guarda la
 * base: «camioneta», «sedan», «sport». Las categorías se administran —alguien
 * puede crear «Roadster» mañana— pero los dibujos no se improvisan, así que
 * una categoría sin boceto propio se dibuja con el representante de su
 * universo en vez de quedarse sin imagen.
 *
 * Todas las superficies que enseñan una categoría —la portada, el selector de
 * cuatro o dos ruedas, el admin— piden el dibujo por aquí, y por eso no pueden
 * mostrar dibujos distintos para lo mismo.
 */
const builders: Record<SketchKey, () => Sketch> = {
  ...carSketches,
  ...motoSketches,
};

const cache = new Map<SketchKey, Sketch>();

export function isSketchKey(value: string): value is SketchKey {
  return (SKETCH_KEYS as readonly string[]).includes(value);
}

/** El representante de cada universo, para lo que no tiene dibujo propio. */
const FALLBACK: Record<VehicleType, SketchKey> = {
  auto: "sedan",
  moto: "naked",
};

export function sketchKeyFor(slug: string, vehicleType: VehicleType): SketchKey {
  // «suv» y «4x4» son la camioneta: una fila que todavía se llame así se
  // dibuja con su boceto, no con el del sedán.
  const key = canonicalBodySlug(slug);
  return isSketchKey(key) ? key : FALLBACK[vehicleType];
}

export function getSketch(key: SketchKey): Sketch {
  let sketch = cache.get(key);
  if (!sketch) {
    sketch = builders[key]();
    cache.set(key, sketch);
  }
  return sketch;
}

/** El boceto de una categoría, listo para poner. */
export function CategorySketch({
  slug,
  vehicleType,
  variant,
  className,
  strokeScale,
}: {
  slug: string;
  vehicleType: VehicleType;
  variant?: SketchVariant;
  className?: string;
  strokeScale?: number;
}) {
  return (
    <BodySketch
      sketch={getSketch(sketchKeyFor(slug, vehicleType))}
      variant={variant}
      className={className}
      strokeScale={strokeScale}
    />
  );
}

export { BodySketch, SKETCH_KEYS };
export type { SketchKey, SketchVariant };
