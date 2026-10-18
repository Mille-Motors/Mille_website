/**
 * Las marcas de las animaciones de entrada, para esparcir sobre un elemento:
 *
 *   <li {...REVEAL}>…</li>
 *
 * `RevealObserver` añade `data-in` a cada una la primera vez que entra en
 * pantalla, a veces antes de que React haya terminado de hidratar esa parte
 * de la página. React no sabe de ese atributo y lo tomaría por una diferencia
 * entre el servidor y el navegador; `suppressHydrationWarning` le dice que en
 * este elemento esa diferencia es intencionada. Solo afecta a los atributos
 * del propio elemento, no a sus hijos.
 *
 * Estos objetos son lo único que lleva `data-reveal` o `data-tone-zone`: así
 * nadie olvida el aviso en un elemento nuevo.
 */
export const REVEAL = {
  "data-reveal": "",
  suppressHydrationWarning: true,
} as const;

/** La fotografía que se abre desde un borde mientras se asienta. */
export const REVEAL_IMAGE = {
  "data-reveal": "image",
  suppressHydrationWarning: true,
} as const;

/** La sección que llega oscura y se aclara a crema al entrar. */
export const TONE_ZONE = {
  "data-tone-zone": "",
  suppressHydrationWarning: true,
} as const;

/** El retraso de una pieza dentro de su sección, en milisegundos. */
export function delay(ms: number): React.CSSProperties {
  return { "--d": `${ms}ms` } as React.CSSProperties;
}
