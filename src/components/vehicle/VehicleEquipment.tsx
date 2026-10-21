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
    <ul className="divide-y divide-ink/12 border-t border-ink/12">
      {items.map((item) => (
        <li key={item.name} className="py-4">
          <p className="text-[1.25rem] leading-snug text-ink">
            {item.name}
          </p>
          {item.description ? (
            <p className="mt-1.5 text-[1.125rem] leading-relaxed text-ink-muted">
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
          <span className="text-[1.125rem] leading-snug text-ink-soft">
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
    <div className="grid gap-5">
      {sections.map((section, index) => (
        // Cada sección es una subcategoría: un recuadro propio, un tono más
        // oscuro que el fondo de la tarjeta de «Equipamiento».
        <section
          key={section.title ?? `sin-seccion-${index}`}
          className="rounded-xl border border-ink/10 bg-cream px-5 py-5 sm:px-6"
        >
          {section.title ? (
            <h3 className="mb-4 text-[1.25rem] leading-snug font-medium text-ink">{section.title}</h3>
          ) : null}
          <CheckList items={section.items} />
        </section>
      ))}
    </div>
  );
}
