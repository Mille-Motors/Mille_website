import { cn } from "@/lib/cn";
import type { SpecBlock, SpecRow } from "@/lib/vehicle-display";

/**
 * Una tabla de especificaciones.
 *
 * Solo dibuja lo que recibe, y `src/lib/vehicle-display.ts` solo construye
 * filas que tienen valor: no hay ninguna rama en este archivo capaz de
 * escribir "N/A". Un bloque sin filas no llega hasta aquí.
 *
 * Es una tabla de datos de verdad, y por eso lleva filetes entre filas: es
 * lo que deja seguir el ojo de la etiqueta a su valor.
 */
export function SpecTable({ rows }: { rows: SpecRow[] }) {
  if (rows.length === 0) return null;

  return (
    <dl className="divide-y divide-ink/12 border-t border-ink/12">
      {rows.map(({ label, value }) => (
        <div
          key={label}
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-baseline gap-x-5 py-3.5"
        >
          <dt className="text-[1.125rem] text-ink-muted">{label}</dt>
          <dd className="text-[1.125rem] text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Varios bloques encadenados. Cada uno es una SUBCATEGORÍA y se dibuja como un
 * recuadro propio, un tono más oscuro que el fondo de la tarjeta que lo
 * contiene: así se distingue de un vistazo la categoría («Especificaciones»,
 * con su encabezado sombreado) de los grupos que tiene dentro («General»,
 * «Motor», «Prestaciones»). El título va en un peso medio: nombra la
 * subcategoría sin competir con el de la categoría.
 */
export function VehicleSpecs({
  blocks,
  columns = false,
}: {
  blocks: SpecBlock[];
  /**
   * Reparte los grupos en dos columnas cuando hay ancho.
   *
   * Un grupo de especificaciones tiene cuatro o cinco filas: apilados en
   * una sola columna sobre una pantalla de 1.400 px dejan dos tercios de la
   * página en blanco y obligan a bajar por nada. Dos columnas los ponen a
   * la vista a la vez sin que ninguna compita con la otra, porque están
   * dentro de la misma sección y no enfrentadas.
   */
  columns?: boolean;
}) {
  if (blocks.length === 0) return null;

  return (
    <div
      className={cn(
        "grid gap-5",
        // `items-start` evita que un recuadro corto se estire hasta la altura
        // del largo que tiene al lado.
        columns && "lg:grid-cols-2 lg:items-start",
      )}
    >
      {blocks.map((block) => (
        <section
          key={block.title}
          className="rounded-xl border border-ink/10 bg-cream px-5 py-5 sm:px-6"
        >
          <h3 className="mb-3 text-[1.25rem] leading-snug font-medium text-ink">
            {block.title}
          </h3>
          <SpecTable rows={block.rows} />
        </section>
      ))}
    </div>
  );
}
