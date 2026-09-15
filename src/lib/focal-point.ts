/**
 * El punto de una fotografía que debe permanecer visible cuando el marco la
 * recorta.
 *
 * No se recorta el archivo: el original se sube entero y sigue intacto en
 * Storage. Lo único que se guarda es dónde mirar, y el recorte lo hace el
 * navegador con `object-fit: cover` más `object-position`. Así el mismo
 * archivo sirve para el marco ancho del escritorio y para el vertical del
 * teléfono, y cambiar de opinión no cuesta volver a subir nada.
 *
 * Los ejes van de 0 a 100 en porcentaje, como los entiende `object-position`:
 * 0 es izquierda/arriba, 50 el centro, 100 derecha/abajo.
 */
export interface FocalPoint {
  x: number;
  y: number;
}

/** El centro: lo que hacía el sitio antes de que esto existiera. */
export const CENTER_FOCAL: FocalPoint = { x: 50, y: 50 };

/**
 * Un eje utilizable siempre, pase lo que pase.
 *
 * Una fila vieja sin columna, un `null` de la base o un `NaN` que se coló por
 * un input no deben dejar la home sin portada: caen al centro, que es
 * exactamente como se veía el sitio antes.
 */
export function clampFocalAxis(value: unknown): number {
  // Solo cuenta un número de verdad. Convertir con `Number()` sería peor que
  // no hacer nada: `null` y `""` valen 0, así que una fila sin encuadre se
  // pegaría al borde izquierdo en vez de quedarse centrada, que es justo el
  // fallback que promete esta función.
  if (typeof value !== "number" || !Number.isFinite(value)) return 50;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export function normalizeFocal(
  focal: { x?: unknown; y?: unknown } | null | undefined,
): FocalPoint {
  if (!focal) return { ...CENTER_FOCAL };
  return { x: clampFocalAxis(focal.x), y: clampFocalAxis(focal.y) };
}

/** Lo que se le pasa a CSS. */
export function objectPosition(focal: FocalPoint): string {
  return `${focal.x}% ${focal.y}%`;
}

export interface Size {
  width: number;
  height: number;
}

/**
 * Cuántos píxeles de la fotografía se salen del marco en cada eje.
 *
 * `cover` escala hasta cubrir, así que sobra en un eje y en el otro no. Lo
 * que sobra es exactamente el recorrido que tiene el encuadre: si sobran 300
 * píxeles de ancho, mover el foco de 0 a 100 desplaza la imagen 300 píxeles.
 * Un eje sin sobrante está clavado, y arrastrar por ahí no debe mover nada.
 */
export function coverOverflow(frame: Size, image: Size): { x: number; y: number } {
  if (
    frame.width <= 0 ||
    frame.height <= 0 ||
    image.width <= 0 ||
    image.height <= 0
  ) {
    return { x: 0, y: 0 };
  }

  const scale = Math.max(frame.width / image.width, frame.height / image.height);
  return {
    x: Math.max(0, image.width * scale - frame.width),
    y: Math.max(0, image.height * scale - frame.height),
  };
}

/**
 * El encuadre resultante de arrastrar la fotografía.
 *
 * El signo es lo que hace que se sienta natural: arrastrar hacia la derecha
 * mueve la fotografía hacia la derecha, lo que significa mirar más a su
 * izquierda, y eso es *bajar* el porcentaje. Invertirlo da esa sensación de
 * control al revés que delata a un editor mal hecho.
 *
 * El desplazamiento se mide contra el sobrante, no contra el marco: así un
 * píxel de ratón es un píxel de fotografía, y el mismo gesto recorre lo mismo
 * en la vista de escritorio que en la de móvil.
 */
export function focalAfterDrag(
  start: FocalPoint,
  delta: { dx: number; dy: number },
  overflow: { x: number; y: number },
): FocalPoint {
  return {
    x: overflow.x > 0 ? clampFocalAxis(start.x - (delta.dx / overflow.x) * 100) : start.x,
    y: overflow.y > 0 ? clampFocalAxis(start.y - (delta.dy / overflow.y) * 100) : start.y,
  };
}

/** Cuánto mueve una flecha del teclado. Shift para ir más rápido. */
export const FOCAL_STEP = 2;
export const FOCAL_STEP_LARGE = 10;

/**
 * El equivalente de teclado del arrastre, con el mismo sentido: lo que se
 * mueve es el recuadro, así que la flecha derecha lo lleva a la derecha y
 * eso significa mirar más a la derecha de la fotografía.
 *
 * Antes el signo estaba invertido porque lo que se arrastraba era la
 * fotografía por detrás de una ventana fija. Al cambiar el editor cambió el
 * sujeto del gesto, y mantener el signo viejo habría dejado el teclado
 * moviéndose al revés que el dedo.
 */
export function focalAfterKey(
  start: FocalPoint,
  key: string,
  large = false,
): FocalPoint | null {
  const step = large ? FOCAL_STEP_LARGE : FOCAL_STEP;
  switch (key) {
    case "ArrowLeft":
      return { ...start, x: clampFocalAxis(start.x - step) };
    case "ArrowRight":
      return { ...start, x: clampFocalAxis(start.x + step) };
    case "ArrowUp":
      return { ...start, y: clampFocalAxis(start.y - step) };
    case "ArrowDown":
      return { ...start, y: clampFocalAxis(start.y + step) };
    default:
      return null;
  }
}

export function sameFocal(a: FocalPoint, b: FocalPoint): boolean {
  // Se redondea a un decimal porque es la precisión que se persiste: sin
  // esto, un arrastre de medio píxel dejaría el botón de guardar encendido
  // para siempre.
  return roundFocalAxis(a.x) === roundFocalAxis(b.x) && roundFocalAxis(a.y) === roundFocalAxis(b.y);
}

/** Un decimal es de sobra: 0,1 % de una foto de 4000 px son 4 px. */
export function roundFocalAxis(value: number): number {
  return Math.round(clampFocalAxis(value) * 10) / 10;
}

export function roundFocal(focal: FocalPoint): FocalPoint {
  return { x: roundFocalAxis(focal.x), y: roundFocalAxis(focal.y) };
}

// ---------------------------------------------------------------------------
// El rectángulo de recorte
// ---------------------------------------------------------------------------

/**
 * La parte de la fotografía que sobrevive al marco, en fracciones de la
 * imagen: `x: 0.25, width: 0.5` significa "la mitad central".
 *
 * Se trabaja en fracciones y no en píxeles porque el editor pinta la
 * fotografía a un tamaño cualquiera —el que quepa en la tarjeta— y la misma
 * cuenta tiene que servir para la vista de escritorio y la de teléfono.
 */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * El recorte que hará `object-fit: cover` con este encuadre.
 *
 * `cover` escala hasta cubrir, así que sobra en un eje y en el otro no: el
 * eje que sobra es el único que se puede recorrer, y el otro queda completo.
 * Cuando las proporciones coinciden no sobra nada y el recorte es la
 * fotografía entera.
 *
 * Es la misma cuenta que hace el navegador con `object-position`, no una
 * aproximación visual: con X %, el borde izquierdo de la ventana cae en
 * `(X/100) · (ancho − anchoVisible)`.
 */
export function coverCropRect(
  image: Size,
  frameRatio: number,
  focal: FocalPoint,
): CropRect {
  if (
    image.width <= 0 ||
    image.height <= 0 ||
    !Number.isFinite(frameRatio) ||
    frameRatio <= 0
  ) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const imageRatio = image.width / image.height;
  const safe = normalizeFocal(focal);

  if (imageRatio > frameRatio) {
    // La fotografía es más apaisada que el marco: sobra ancho.
    const width = frameRatio / imageRatio;
    return { x: (safe.x / 100) * (1 - width), y: 0, width, height: 1 };
  }

  if (imageRatio < frameRatio) {
    // La fotografía es más alta que el marco: sobra alto.
    const height = imageRatio / frameRatio;
    return { x: 0, y: (safe.y / 100) * (1 - height), width: 1, height };
  }

  return { x: 0, y: 0, width: 1, height: 1 };
}

/**
 * El camino de vuelta: dónde quedó el recuadro, qué encuadre significa.
 *
 * El eje sin recorrido conserva el valor que traía. No es un detalle: si se
 * devolviera 50 se perdería en silencio el encuadre vertical al cambiar a la
 * vista de escritorio, donde a lo mejor solo se puede mover en horizontal.
 * Es lo que hace que `focal → recuadro → focal` vuelva al mismo sitio.
 */
export function focalFromCropRect(
  image: Size,
  frameRatio: number,
  position: { x: number; y: number },
  base: FocalPoint = CENTER_FOCAL,
): FocalPoint {
  const rect = coverCropRect(image, frameRatio, base);
  const freeX = 1 - rect.width;
  const freeY = 1 - rect.height;

  return {
    x: freeX > 0 ? clampFocalAxis((position.x / freeX) * 100) : clampFocalAxis(base.x),
    y: freeY > 0 ? clampFocalAxis((position.y / freeY) * 100) : clampFocalAxis(base.y),
  };
}

/**
 * Arrastrar el recuadro sobre la fotografía.
 *
 * El gesto se mide contra el tamaño al que se está pintando la fotografía, no
 * contra el marco: así el recuadro sigue al dedo exactamente, y el recorrido
 * se detiene en el borde en vez de dejar que el recuadro se salga de la foto.
 */
export function focalAfterCropDrag(
  image: Size,
  frameRatio: number,
  start: FocalPoint,
  delta: { dx: number; dy: number },
  displayed: Size,
): FocalPoint {
  if (displayed.width <= 0 || displayed.height <= 0) return start;

  const rect = coverCropRect(image, frameRatio, start);
  const freeX = 1 - rect.width;
  const freeY = 1 - rect.height;

  const x = clamp01(rect.x + delta.dx / displayed.width, freeX);
  const y = clamp01(rect.y + delta.dy / displayed.height, freeY);

  return focalFromCropRect(image, frameRatio, { x, y }, start);
}

function clamp01(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > max) return max;
  return value;
}
