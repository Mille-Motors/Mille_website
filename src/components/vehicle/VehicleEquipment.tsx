import { Check } from "lucide-react";
import { groupFeatures } from "@/lib/equipment-catalog";
import type { SpecialEquipmentItem } from "@/types/vehicle";

/**
 * El equipamiento de la ficha, en tres capas y en este orden:
 *
 *   1. las opciones destacadas de ESTA unidad —un Bowers & Wilkins, unos
 *      frenos carbono-cerámicos, un paquete Individual—, que es lo que
 *      distingue este carro de otro igual;
 *   2. el equipamiento de catálogo, agrupado por categoría;
 *   3. lo que se escribió a mano y no cabía en ninguna lista.
 *
 * Cualquiera de las tres puede faltar entera y no deja hueco.
 */

/** Las opciones especiales, con su descripción cuando la tienen. */
export function VehicleHighlights({
  items,
}: {
  items: SpecialEquipmentItem[];
}) {
  if (items.length === 0) return null;

  return (
    <ul className="divide-y divide-stone border-t border-stone">
      {items.map((item) => (
        <li key={item.name} className="py-4">
          <p className="font-serif text-[1.0625rem] leading-snug text-ink">
            {item.name}
          </p>
          {item.description ? (
            <p className="mt-1.5 font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
              {item.description}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <Check
            aria-hidden
            strokeWidth={1.4}
            className="mt-0.5 size-4 shrink-0 text-burgundy"
          />
          <span className="font-serif text-[0.9375rem] leading-snug text-ink-soft">
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * El equipamiento de catálogo por categorías, más el texto libre al final
 * bajo su propio título. Un grupo sin nada seleccionado no se dibuja: eso lo
 * decide `groupFeatures`, que solo devuelve los que tienen contenido.
 */
export function VehicleEquipment({
  features,
  extra,
}: {
  /** Claves del catálogo. */
  features: string[];
  /** Equipamiento adicional escrito a mano. */
  extra: string[];
}) {
  const groups = groupFeatures(features);
  if (groups.length === 0 && extra.length === 0) return null;

  return (
    <div className="grid gap-8">
      {groups.map((group) => (
        <section key={group.key}>
          <h3 className="eyebrow mb-4 text-ink-muted">{group.title}</h3>
          <CheckList items={group.labels} />
        </section>
      ))}
      {extra.length > 0 ? (
        <section>
          <h3 className="eyebrow mb-4 text-ink-muted">Adicional</h3>
          <CheckList items={extra} />
        </section>
      ) : null}
    </div>
  );
}
