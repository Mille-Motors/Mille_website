/**
 * Qué es realmente un archivo, mirando sus primeros bytes.
 *
 * El `Content-Type` que manda el navegador y la extensión del archivo son lo
 * que alguien dice que es; los bytes mágicos son lo que es. Renombrar un
 * ejecutable a .jpg no cambia su contenido, y esta función es la que lo
 * distingue.
 *
 * Es pura y vive fuera de `src/server` para poder probarla sin arrastrar la
 * capa de Storage entera.
 */

/** Formatos que el sitio sabe mostrar. Nada más entra. */
export const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/avif": ["avif"],
} as const;

export type AllowedMime = keyof typeof ALLOWED_IMAGE_TYPES;

export function sniffImageType(bytes: Uint8Array): AllowedMime | null {
  const startsWith = (...signature: number[]) =>
    signature.every((byte, i) => bytes[i] === byte);

  if (startsWith(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return "image/png";
  }
  // RIFF....WEBP — los cuatro bytes de la marca importan: un WAV también
  // empieza por RIFF.
  if (
    startsWith(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  // Caja ftyp con marca avif/avis; otras marcas son vídeo, no imagen.
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return null;
}

/**
 * `image/jpg` no es un tipo MIME real pero se sigue viendo; se trata como
 * sinónimo para no rechazar subidas legítimas.
 */
export function normalizeDeclaredType(declared: string): string {
  return declared === "image/jpg" ? "image/jpeg" : declared;
}
