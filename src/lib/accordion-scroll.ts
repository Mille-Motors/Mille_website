/**
 * Qué pasa cuando se pulsa el título de una sección desplegable.
 *
 * Está aparte del componente porque es la parte que se puede probar: el
 * proyecto no tiene jsdom, así que no se comprueba aquí una animación, pero sí
 * la DECISIÓN —qué queda abierto—.
 *
 * Cada sección se abre y se cierra por su cuenta, y puede haber varias
 * abiertas a la vez. Antes abrir una cerraba la anterior; eso obligaba a
 * mover la pantalla —el título pulsado subía cuando lo de arriba se encogía—
 * y a quien compara «Especificaciones» con «Equipamiento» le quitaba lo que
 * estaba leyendo. Al no cerrarse nada por el camino, lo que hay encima del
 * título pulsado no cambia nunca de alto, y la página no tiene motivo para
 * moverse.
 */

/**
 * Las secciones abiertas después de pulsar `clicked`: la abre si estaba
 * cerrada y la cierra si estaba abierta. Devuelve un conjunto nuevo; el que
 * llega no se modifica.
 */
export function toggleSection(
  open: ReadonlySet<string>,
  clicked: string,
): Set<string> {
  const next = new Set(open);
  if (next.has(clicked)) next.delete(clicked);
  else next.add(clicked);
  return next;
}

/** Las secciones abiertas tras revelar `id` —por ejemplo, al buscar texto—. */
export function revealSection(
  open: ReadonlySet<string>,
  id: string,
): ReadonlySet<string> {
  // Si ya estaba abierta no hay nada que cambiar; devolver el mismo conjunto
  // evita un render que no mostraría nada distinto.
  if (open.has(id)) return open;
  return new Set(open).add(id);
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
