import { Check } from "lucide-react";
import { equipmentSections } from "@/lib/equipment";
import type { SpecialEquipmentItem } from "@/types/vehicle";

/**
 * El equipamiento de la ficha, en tres capas y en este orden:
 *
 *   1. las opciones destacadas de ESTA unidad —un Bowers & Wilkins, unos
 *      frenos carbono-cerámicos, un paquete Individual—, que es lo que
 *      distingue este carro de otro igual;
 *   2. el equipamiento, agrupado por las secciones que se escribieron.
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
 * El equipamiento, agrupado por las secciones que se escribieron.
 *
 * Las secciones salen del propio texto —una línea `[Frenos]` abre una— así
 * que lo que se ve es exactamente lo que alguien escribió, sin un catálogo
 * que decida por él. Lo que venga sin sección cae en un grupo sin epígrafe y
 * se dibuja igual.
 */
export function VehicleEquipment({ equipment }: { equipment: string[] }) {
  const sections = equipmentSections(equipment);
  if (sections.length === 0) return null;

  return (
    <div className="grid gap-8">
      {sections.map((section, index) => (
        <section key={section.title ?? `sin-seccion-${index}`}>
          {section.title ? (
            <h3 className="eyebrow mb-4 text-ink-muted">{section.title}</h3>
          ) : null}
          <CheckList items={section.items} />
        </section>
      ))}
    </div>
  );
}
