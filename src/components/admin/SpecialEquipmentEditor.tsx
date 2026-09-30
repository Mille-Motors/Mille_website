"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input, Textarea } from "@/components/ui/Field";
import type { SpecialEquipmentItem } from "@/types/vehicle";

/**
 * Las opciones destacadas de ESTA unidad.
 *
 * El catálogo cubre lo que se repite —cámara 360, techo panorámico—, pero no
 * puede prever un Burmester, unos frenos carbono-cerámicos ni un paquete
 * Individual pedido por el primer dueño. Eso es texto libre por definición,
 * y es además lo primero que la ficha pública enseña, antes del
 * equipamiento normal: es lo que distingue este carro de otro igual.
 *
 * La descripción es opcional a propósito: "Bowers & Wilkins Diamond" ya dice
 * bastante, y obligar a explicarlo produciría relleno.
 */
export function SpecialEquipmentEditor({
  items,
  onChange,
  error,
}: {
  items: SpecialEquipmentItem[];
  onChange: (items: SpecialEquipmentItem[]) => void;
  error?: string;
}) {
  const update = (index: number, patch: Partial<SpecialEquipmentItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  return (
    <div>
      {items.length === 0 ? (
        <p className="font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
          Nada todavía. La mayoría de los vehículos no necesitan esta sección:
          úsala solo cuando la unidad traiga algo que de verdad la distinga.
        </p>
      ) : (
        <ul className="grid gap-5">
          {items.map((item, index) => (
            <li
              key={index}
              className="border border-stone bg-cream/40 px-4 py-4 sm:px-5"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1 grid gap-4">
                  <Input
                    label="Nombre del extra"
                    value={item.name}
                    placeholder="Bowers & Wilkins Diamond Surround"
                    onChange={(event) => update(index, { name: event.target.value })}
                  />
                  <Textarea
                    label="Descripción (opcional)"
                    rows={2}
                    value={item.description ?? ""}
                    onChange={(event) =>
                      update(index, { description: event.target.value || null })
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                  aria-label={`Quitar ${item.name || "extra"}`}
                  className="mt-8 inline-flex size-9 shrink-0 items-center justify-center text-ink-muted transition-colors hover:text-burgundy"
                >
                  <Trash2 aria-hidden className="size-4" strokeWidth={1.5} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="mt-3 text-xs text-burgundy">{error}</p> : null}

      <button
        type="button"
        onClick={() => onChange([...items, { name: "", description: null }])}
        className="label-caps mt-5 inline-flex items-center gap-2 rounded-xs border border-stone px-4 py-2.5 text-ink transition-colors hover:border-ink/40"
      >
        <Plus aria-hidden className="size-3.5" strokeWidth={1.5} />
        Añadir extra
      </button>
    </div>
  );
}
