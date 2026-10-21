/**
 * Las páginas que se dibujan en un paginador: la primera, la última y las
 * vecinas de la actual, con «…» donde se salta. Siete elementos como máximo,
 * así que el paginador no cambia de ancho al avanzar.
 *
 *   pageWindow(1, 3)   -> [1, 2, 3]
 *   pageWindow(1, 20)  -> [1, 2, "…", 20]
 *   pageWindow(10, 20) -> [1, "…", 9, 10, 11, "…", 20]
 */
export type PageItem = number | "…";

export function pageWindow(current: number, pages: number): PageItem[] {
  if (pages <= 0) return [];
  const page = Math.min(Math.max(1, current), pages);

  // Con siete o menos caben todas.
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);

  const items: PageItem[] = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(pages - 1, page + 1);

  // Un hueco de una sola página no se abrevia: «…» ocuparía lo mismo que el
  // número que esconde.
  if (from === 3) items.push(2);
  else if (from > 3) items.push("…");

  for (let p = from; p <= to; p++) items.push(p);

  if (to === pages - 2) items.push(pages - 1);
  else if (to < pages - 2) items.push("…");

  items.push(pages);
  return items;
}
