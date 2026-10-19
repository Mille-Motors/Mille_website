import type { PixelSize, SiteMediaFrame } from "@/lib/site-media";
import {
  MIN_IMAGE_HEIGHT,
  MIN_IMAGE_WIDTH,
  type ImageDimensions,
} from "@/lib/image-dimensions";

/**
 * Si una fotografía da de sí para el hueco donde va.
 *
 * El dato que importa no es cuánto mide el archivo, sino cuánto queda
 * DESPUÉS del recorte. Una panorámica de 6000 × 1500 tiene de sobra para un
 * hueco 4:3 en ancho y no llega ni de lejos en alto: contar solo los 6000
 * diría «excelente» de una fotografía que se va a ver blanda.
 *
 * Es un módulo puro: lo usan el Admin para avisar antes de subir y el
 * servidor para dejar constancia de en qué estado quedó cada slot.
 */

export type QualityLevel =
  | "excellent"
  | "recommended"
  | "acceptable"
  | "low"
  | "below";

export interface QualityVerdict {
  level: QualityLevel;
  label: string;
  /** Lo que sobrevive al recorte, en píxeles. */
  effective: PixelSize;
  /** `true` cuando el recorte se come más de un tercio del original. */
  aggressiveCrop: boolean;
}

const LABELS: Record<QualityLevel, string> = {
  excellent: "Excelente",
  recommended: "Recomendada",
  acceptable: "Aceptable",
  low: "Resolución baja",
  below: "Por debajo del mínimo",
};

export function qualityLabel(level: QualityLevel): string {
  return LABELS[level];
}

/**
 * Lo que queda de una fotografía al recortarla a una proporción, sin
 * ampliar nada: es `object-fit: cover` contado en píxeles del original.
 */
export function effectiveSize(source: PixelSize, ratio: number): PixelSize {
  if (
    source.width <= 0 ||
    source.height <= 0 ||
    !Number.isFinite(ratio) ||
    ratio <= 0
  ) {
    return { width: 0, height: 0 };
  }

  const sourceRatio = source.width / source.height;
  if (sourceRatio > ratio) {
    // Sobra ancho: manda el alto.
    return { width: Math.round(source.height * ratio), height: source.height };
  }
  // Sobra alto —o encaja justo—: manda el ancho.
  return { width: source.width, height: Math.round(source.width / ratio) };
}

/** Qué fracción del original sobrevive al recorte. 1 = entera. */
export function survivingFraction(source: PixelSize, ratio: number): number {
  if (source.width <= 0 || source.height <= 0) return 0;
  const kept = effectiveSize(source, ratio);
  return (kept.width * kept.height) / (source.width * source.height);
}

/**
 * Un uno por ciento de holgura.
 *
 * Las proporciones de los slots son decimales redondeados —0,56 describe un
 * 1080 × 1920 que en realidad es 0,5625— así que recortar a la proporción
 * declarada pierde un par de píxeles contra el número declarado. Sin
 * holgura, el mínimo de un slot se rechazaría a sí mismo. Un uno por ciento
 * de resolución lineal no lo ve nadie y no deja pasar nada que de verdad
 * sea pequeño.
 */
const TOLERANCE = 0.99;

const atLeast = (size: PixelSize, target: PixelSize, factor = 1) =>
  size.width >= target.width * factor * TOLERANCE &&
  size.height >= target.height * factor * TOLERANCE;

/**
 * El veredicto para un marco del sitio.
 *
 * Los escalones salen de los propios números del slot, no de una tabla
 * aparte: «aceptable» es la mitad del camino entre el mínimo y lo
 * recomendado, y «excelente» es un 25 % por encima de lo recomendado. Así,
 * cambiar la recomendación de un slot mueve sus avisos sin tocar esto.
 */
export function frameQuality(
  source: PixelSize,
  frame: SiteMediaFrame,
): QualityVerdict {
  const effective = effectiveSize(source, frame.ratio);
  const { recommended, minimum } = frame;
  const midpoint: PixelSize = {
    width: Math.round((recommended.width + minimum.width) / 2),
    height: Math.round((recommended.height + minimum.height) / 2),
  };

  const level: QualityLevel = !atLeast(effective, minimum)
    ? "below"
    : atLeast(effective, recommended, 1.25)
      ? "excellent"
      : atLeast(effective, recommended)
        ? "recommended"
        : atLeast(effective, midpoint)
          ? "acceptable"
          : "low";

  return {
    level,
    label: LABELS[level],
    effective,
    // Un tercio es donde el recorte deja de ser un ajuste y pasa a ser otra
    // fotografía: conviene decirlo aunque la resolución alcance.
    aggressiveCrop: survivingFraction(source, frame.ratio) < 0.67,
  };
}

// ---------------------------------------------------------------------------
// Fotografías de vehículo
// ---------------------------------------------------------------------------

/**
 * La escalera de las fotos de vehículo.
 *
 * Aquí los números no se derivan: están puestos a mano porque describen lo
 * que sale de una cámara real —un móvil moderno da 4032 × 3024— y no el
 * tamaño de un hueco. El mínimo duro sigue siendo el de siempre, el que
 * rechaza la subida; todo lo demás es un aviso.
 */
const VEHICLE_LADDER: { width: number; level: QualityLevel; label: string }[] = [
  { width: 4000, level: "excellent", label: "Excelente" },
  { width: 3000, level: "recommended", label: "Recomendada" },
  { width: 2400, level: "acceptable", label: "Buena" },
  { width: 1920, level: "acceptable", label: "Aceptable" },
  { width: 1280, level: "low", label: "Resolución baja" },
  { width: MIN_IMAGE_WIDTH, level: "low", label: "Mínimo permitido" },
];

export function vehicleQuality(source: ImageDimensions): QualityVerdict {
  // Contra el marco canónico de la ficha, no contra el archivo entero: una
  // vertical de teléfono tiene 3024 de ancho y pierde la mitad del alto.
  const effective = effectiveSize(source, 4 / 3);
  const below =
    source.width < MIN_IMAGE_WIDTH || source.height < MIN_IMAGE_HEIGHT;

  if (below) {
    return {
      level: "below",
      label: LABELS.below,
      effective,
      aggressiveCrop: false,
    };
  }

  const step =
    VEHICLE_LADDER.find((entry) => effective.width >= entry.width) ??
    VEHICLE_LADDER[VEHICLE_LADDER.length - 1];

  return {
    level: step.level,
    label: step.label,
    effective,
    aggressiveCrop: survivingFraction(source, 4 / 3) < 0.67,
  };
}

/** Para los textos: «2.400 × 1.800 px». */
export function formatSize(size: PixelSize): string {
  const n = (value: number) => value.toLocaleString("es-CO");
  return `${n(size.width)} × ${n(size.height)} px`;
}

/** Para los textos: «7,8 MB». */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toLocaleString("es-CO", { maximumFractionDigits: 0 })} kB`;
  }
  return `${(bytes / (1024 * 1024)).toLocaleString("es-CO", { maximumFractionDigits: 1 })} MB`;
}
