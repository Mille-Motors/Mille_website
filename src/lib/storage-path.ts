/**
 * Sanea el prefijo de una ruta de Supabase Storage.
 *
 * El saneado anterior aplicaba la lista de caracteres permitidos a la cadena
 * entera, así que se comía la `/` y convertía `vehicles/<id>` en
 * `vehicles-<id>`: seguro, pero aplanaba la organización del bucket y dejaba
 * dos convenciones conviviendo.
 *
 * La barra es estructura, no contenido. Se separa primero y se sanea cada
 * segmento por su cuenta, que es lo que permite conservar las carpetas sin
 * dejar de acotar lo que puede aparecer dentro de cada una.
 *
 * Sobre el recorrido de rutas: los segmentos `.` y `..` se descartan después
 * de sanear —el punto es un carácter permitido, así que `..` sobreviviría al
 * filtro de caracteres—, y los vacíos también, de modo que `a//b` o `../a`
 * no pueden escaparse del prefijo ni producir una ruta con un hueco. Hoy
 * ningún llamante puede construir algo así: el prefijo sale de un uuid de la
 * base o de una clave de la lista cerrada de slots. Esto es la red por si
 * mañana deja de ser cierto.
 */
export function sanitizeStoragePrefix(prefix: string): string {
  const segments = prefix
    .split("/")
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, "-"))
    .filter(
      (segment) => segment !== "" && segment !== "." && segment !== "..",
    );

  if (segments.length === 0) {
    throw new Error(
      `El prefijo "${prefix}" no deja ningún segmento utilizable.`,
    );
  }

  return segments.join("/");
}
