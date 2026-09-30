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
export function VehicleSpecs({ blocks }: { blocks: SpecBlock[] }) {
  if (blocks.length === 0) return null;

  return (
    <div className="grid gap-9">
      {blocks.map((block) => (
        <section key={block.title}>
          <h3 className="eyebrow mb-3 text-ink-muted">{block.title}</h3>
          <SpecTable rows={block.rows} />
        </section>
      ))}
    </div>
  );
}
