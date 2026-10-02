/**
 * Qué pasa cuando se pulsa el título de una sección desplegable.
 *
 * Está aparte del componente porque es la parte que se puede probar: el
 * proyecto no tiene jsdom, así que comprobar un `scrollIntoView` real no es
 * posible, pero sí lo es fijar la DECISIÓN —abrir o cerrar, y si hay que
 * reposicionar— que es donde estaba el fallo.
 *
 * El fallo: al abrir una sección que estaba cerrada, el contenido crecía
 * hacia abajo desde un título que ya estaba a media pantalla, y se acababa
 * leyendo desde la mitad. Al cerrar, en cambio, no hay nada que reposicionar:
 * la página se recoge sola y saltar a algún sitio sería moverle el suelo a
 * quien no lo pidió.
 */
export interface ToggleOutcome {
  /** La sección que queda abierta, o `null` si ninguna. */
  open: string | null;
  /**
   * La sección a cuyo inicio hay que llevar la vista, o `null` si no hay que
   * tocar el scroll. Solo se rellena al ABRIR.
   */
  scrollTo: string | null;
}

/**
 * Pulsar `clicked` teniendo `current` abierta.
 *
 * Sigue habiendo como máximo una abierta. Cambiar de una a otra cierra la
 * primera y lleva a la segunda: no se pasa antes por la que se cerró, que
 * sería un salto hacia arriba y otro hacia abajo en el mismo gesto.
 */
export function toggleSection(
  current: string | null,
  clicked: string,
): ToggleOutcome {
  if (current === clicked) {
    return { open: null, scrollTo: null };
  }
  return { open: clicked, scrollTo: clicked };
}

/**
 * Cómo moverse hasta allí.
 *
 * Suave por defecto, instantáneo para quien ha pedido menos movimiento en su
 * sistema. No es un detalle estético: un desplazamiento animado puede
 * producir mareo a quien activa esa preferencia justamente por eso.
 */
export function scrollBehaviorFor(prefersReducedMotion: boolean): ScrollBehavior {
  return prefersReducedMotion ? "auto" : "smooth";
}
