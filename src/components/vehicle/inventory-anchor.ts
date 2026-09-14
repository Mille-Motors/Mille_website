/**
 * El ancla del inventario: donde empieza el contexto, los filtros y la
 * rejilla, ya pasada la elección de Carros/Motos/Todo.
 *
 * Vive aquí para que haya un solo sitio que sepa a dónde se baja y cómo. Lo
 * usan el CTA "Ver inventario" de toda la web, el salto al llegar con
 * #inventario en la URL y el selector de tipo.
 */
export const INVENTORY_ANCHOR_ID = "inventario";

/**
 * `scroll-mt-20` en la sección es lo que deja el destino por debajo del
 * navbar en vez de escondido detrás; aquí solo se decide el movimiento.
 *
 * Quien pide movimiento reducido recibe un salto sin animar: la intención
 * —llegar al inventario— se cumple igual, y animar un desplazamiento largo
 * es justo lo que esa preferencia existe para evitar.
 */
export function scrollToInventory(behavior: ScrollBehavior = "smooth"): void {
  const target = document.getElementById(INVENTORY_ANCHOR_ID);
  if (!target) return;

  const prefersReduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  target.scrollIntoView({
    behavior: prefersReduced ? "instant" : behavior,
    block: "start",
  });
}
