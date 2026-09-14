import { notFound } from "next/navigation";

/**
 * Cualquier ruta de /admin que no exista.
 *
 * Sin esto, Next no resolvía ninguna ruta y caía en la 404 pública: el
 * Superadmin acababa fuera del panel, y quien no tenía sesión ni siquiera
 * pasaba por el proxy. Al existir esta ruta, ambas cosas se arreglan solas —
 * el guard del layout (panel) se aplica igual que en el resto del Admin, y
 * el `notFound()` cae en la 404 administrativa, con su barra lateral.
 *
 * Las rutas reales siguen teniendo prioridad sobre este comodín.
 */
export default function AdminCatchAll() {
  notFound();
}
