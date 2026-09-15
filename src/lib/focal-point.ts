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
 * El equivalente de teclado del arrastre, con el mismo sentido: la flecha
 * derecha empuja la fotografía a la derecha, igual que el dedo.
 */
export function focalAfterKey(
  start: FocalPoint,
  key: string,
  large = false,
): FocalPoint | null {
  const step = large ? FOCAL_STEP_LARGE : FOCAL_STEP;
  switch (key) {
    case "ArrowLeft":
      return { ...start, x: clampFocalAxis(start.x + step) };
    case "ArrowRight":
      return { ...start, x: clampFocalAxis(start.x - step) };
    case "ArrowUp":
      return { ...start, y: clampFocalAxis(start.y + step) };
    case "ArrowDown":
      return { ...start, y: clampFocalAxis(start.y - step) };
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
