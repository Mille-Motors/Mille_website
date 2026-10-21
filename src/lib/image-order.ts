/**
 * El orden de las fotografías de un vehículo.
 *
 * El gestor del admin reordena SIN esperar al servidor: la fila cambia en el
 * momento en que se suelta una foto, y la petición viaja detrás. Para que eso
 * no se descuadre hace falta una lógica que no dependa de la pantalla, y es la
 * que está aquí.
 */

/** Una copia de `list` con el elemento de `from` puesto en `to`. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  if (from === to || from < 0 || from >= next.length) return next;
  const target = Math.min(Math.max(to, 0), next.length - 1);
  const [picked] = next.splice(from, 1);
  next.splice(target, 0, picked);
  return next;
}

/** ¿Son el mismo orden? Sirve para no avisar al servidor de lo que no cambió. */
export function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * El orden que se enseña, a partir del que se está esperando que el servidor
 * confirme y de las fotos que de verdad existen.
 *
 * Mientras una petición viaja puede pasar casi cualquier cosa: llega una foto
 * nueva de una subida, otra se borra desde otra pestaña. El orden pendiente se
 * respeta en lo que todavía existe, y lo que no conoce —una foto nueva— se
 * añade al final, en el orden del servidor, en vez de desaparecer de la
 * pantalla.
 */
export function reconcileOrder(
  pending: readonly string[] | null,
  serverIds: readonly string[],
): string[] {
  if (!pending) return [...serverIds];
  const known = new Set(serverIds);
  const kept = pending.filter((id) => known.has(id));
  const placed = new Set(kept);
  return [...kept, ...serverIds.filter((id) => !placed.has(id))];
}
