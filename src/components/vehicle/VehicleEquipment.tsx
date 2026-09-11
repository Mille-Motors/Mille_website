import { Check } from "lucide-react";

export function VehicleEquipment({ items }: { items: string[] }) {
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
