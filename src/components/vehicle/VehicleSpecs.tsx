import { cn } from "@/lib/cn";
import type { SpecBlock, SpecRow } from "@/lib/vehicle-display";

/**
 * Una tabla de especificaciones.
 *
 * Solo dibuja lo que recibe, y `src/lib/vehicle-display.ts` solo construye
 * filas que tienen valor: no hay ninguna rama en este archivo capaz de
 * escribir "N/A". Un bloque sin filas no llega hasta aquí.
 */
export function SpecTable({ rows }: { rows: SpecRow[] }) {
  if (rows.length === 0) return null;

  return (
    <dl className="divide-y divide-stone border-t border-stone">
      {rows.map(({ label, value }) => (
        <div
          key={label}
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-baseline gap-x-5 py-3.5"
        >
          <dt className="font-serif text-[0.9375rem] text-ink-muted">{label}</dt>
          <dd className="font-serif text-[0.9375rem] text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Varios bloques encadenados. El título de cada uno va en `eyebrow`, que es
 * como el resto del sitio nombra una subsección sin competir con los títulos
 * de sección en display.
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
        "grid gap-9",
        // `items-start` evita que un grupo corto estire su filete hasta la
        // altura del largo que tiene al lado.
        columns && "lg:grid-cols-2 lg:items-start lg:gap-x-14",
      )}
    >
      {blocks.map((block) => (
        <section key={block.title}>
          <h3 className="eyebrow mb-3 text-ink-muted">{block.title}</h3>
          <SpecTable rows={block.rows} />
        </section>
      ))}
    </div>
  );
}
