/**
 * Cuánto mide una imagen, leyendo su cabecera.
 *
 * Existe por un fallo que no daba ningún error: se subían fotografías de
 * 516×387 y el sistema las aceptaba sin decir nada. No se pierde calidad en
 * ninguna parte del camino —el objeto se guarda byte a byte y Next nunca
 * amplía por encima del original— pero un máster de 516 px metido en un
 * hueco de 860 lo estira el navegador, y el resultado se ve borroso. La
 * única forma de arreglarlo es no dejar que entre.
 *
 * Se leen las cabeceras a mano en vez de traer una dependencia: son cuatro
 * formatos y unas cuantas decenas de bytes de cada uno. Una librería de
 * imágenes para contestar "cuánto mide" sería desproporcionada.
 *
 * Devuelve `null` cuando no se puede averiguar. Quien llama decide qué
 * hacer con eso, y la respuesta correcta es dejar pasar: rechazar una
 * imagen válida porque su cabecera es rara sería peor que el problema.
 */
export interface ImageDimensions {
  width: number;
  height: number;
}

/** El lado largo, que es lo que determina si la foto da de sí. */
export function longEdge(dimensions: ImageDimensions): number {
  return Math.max(dimensions.width, dimensions.height);
}

export function readImageDimensions(bytes: Uint8Array): ImageDimensions | null {
  return (
    readJpeg(bytes) ?? readPng(bytes) ?? readWebp(bytes) ?? readAvif(bytes)
  );
}

const u16 = (b: Uint8Array, at: number) => (b[at] << 8) | b[at + 1];
const u32 = (b: Uint8Array, at: number) =>
  ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;

/**
 * JPEG: se recorren los segmentos hasta dar con un marcador SOF, que es el
 * que lleva las dimensiones. Los SOF de 0xC4, 0xC8 y 0xCC NO son de inicio
 * de cuadro —son tablas Huffman y aritméticas— y confundirlos es el error
 * clásico de este parseo.
 */
function readJpeg(b: Uint8Array): ImageDimensions | null {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;

  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = b[i + 1];
    // Relleno, inicio/fin de imagen y reinicios: no llevan longitud.
    if (marker === 0xff || marker === 0xd8) {
      i += 1;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker >= 0xd0 && marker <= 0xd7) {
      i += 2;
      continue;
    }

    const isStartOfFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;

    if (isStartOfFrame) {
      return { height: u16(b, i + 5), width: u16(b, i + 7) };
    }
    const length = u16(b, i + 2);
    if (length < 2) return null;
    i += 2 + length;
  }
  return null;
}

function readPng(b: Uint8Array): ImageDimensions | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 24 || signature.some((byte, at) => b[at] !== byte)) return null;
  return { width: u32(b, 16), height: u32(b, 20) };
}

/** WebP tiene tres variantes y cada una guarda el tamaño en otro sitio. */
function readWebp(b: Uint8Array): ImageDimensions | null {
  if (b.length < 30) return null;
  const tag = (at: number) => String.fromCharCode(b[at], b[at + 1], b[at + 2], b[at + 3]);
  if (tag(0) !== "RIFF" || tag(8) !== "WEBP") return null;

  const format = tag(12);
  if (format === "VP8X") {
    return {
      width: (b[24] | (b[25] << 8) | (b[26] << 16)) + 1,
      height: (b[27] | (b[28] << 8) | (b[29] << 16)) + 1,
    };
  }
  if (format === "VP8 ") {
    return {
      width: (b[26] | (b[27] << 8)) & 0x3fff,
      height: (b[28] | (b[29] << 8)) & 0x3fff,
    };
  }
  if (format === "VP8L") {
    const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  return null;
}

/**
 * AVIF: el tamaño vive en la caja `ispe`, en algún punto de la cabecera.
 * Se busca la etiqueta en vez de recorrer el árbol de cajas entero, que
 * para esto sería mucho código a cambio de nada.
 */
function readAvif(b: Uint8Array): ImageDimensions | null {
  const limit = Math.min(b.length - 12, 4096);
  for (let i = 0; i < limit; i += 1) {
    if (
      b[i] === 0x69 && // i
      b[i + 1] === 0x73 && // s
      b[i + 2] === 0x70 && // p
      b[i + 3] === 0x65 // e
    ) {
      // 4 bytes de versión y banderas antes de las dimensiones.
      return { width: u32(b, i + 8), height: u32(b, i + 12) };
    }
  }
  return null;
}

/**
 * El hueco principal de la ficha mide unos 860 px de CSS en un contenedor
 * de 1.480, que en una pantalla Retina son 1.720 reales. El ANCHO es por
 * tanto la restricción que manda, y el alto solo existe para descartar
 * tiras: una panorámica de 3.000×500 cumpliría cualquier regla de lado
 * largo y seguiría sin servir para un hero de 3:2.
 *
 * Mirar solo el lado largo era insuficiente: una foto de 600×1.200 lo
 * pasaba y es demasiado estrecha para el hueco. Por eso la regla pide las
 * dos dimensiones.
 *
 * Lo que sí entra con esto: horizontal y vertical de móvil (4032×3024 y
 * 3024×4032), 4:3 desde 1000×750, 3:2 desde 1000×667… no, 667 < 700, así
 * que 3:2 entra desde 1050×700, y 16:9 desde 1280×720. Lo que no: 516×387,
 * 375×500 y 600×1200.
 */
export const MIN_IMAGE_WIDTH = 1000;
export const MIN_IMAGE_HEIGHT = 700;
export const RECOMMENDED_IMAGE_LONG_EDGE = 2000;

/**
 * Lo máximo que puede pesar la fotografía de un vehículo.
 *
 * Vive aquí, junto al resto de reglas de una foto de vehículo, porque este
 * módulo es puro: lo importan el navegador —que descarta el archivo antes
 * de empezar a subirlo— y el servidor, sin que ninguno tenga que repetir el
 * número. La tercera capa es el bucket, que lo impone por su cuenta y es la
 * única que el cliente no puede saltarse.
 *
 * Eran diez mebibytes y rechazaban justo lo que el sistema pide subir: un
 * teléfono reciente produce originales de doce a veinte. Veinticinco cabe
 * holgadamente y sigue siendo un tope — no se recomprime nada en ninguna
 * parte del camino, así que lo que entra es lo que se guarda.
 */
export const MAX_VEHICLE_IMAGE_BYTES = 25 * 1024 * 1024;

/** El mismo número, para los textos de la interfaz. */
export const MAX_VEHICLE_IMAGE_LABEL = "25 MB";

/** El motivo por el que una imagen no sirve, o `null` si sirve. */
export function imageTooSmall(dimensions: ImageDimensions): string | null {
  if (
    dimensions.width >= MIN_IMAGE_WIDTH &&
    dimensions.height >= MIN_IMAGE_HEIGHT
  ) {
    return null;
  }
  return (
    `Esa imagen mide ${dimensions.width}×${dimensions.height} px y se vería borrosa en la ficha. ` +
    `Hacen falta al menos ${MIN_IMAGE_WIDTH}×${MIN_IMAGE_HEIGHT} px; ` +
    `lo ideal son ${RECOMMENDED_IMAGE_LONG_EDGE} px en el lado largo.`
  );
}
