import { twMerge } from "tailwind-merge";

type ClassValue = string | number | null | undefined | false | ClassValue[];

/**
 * Joins class names and resolves Tailwind conflicts, so a `className` prop
 * can override a component's own utilities (`hidden` beating `inline-flex`).
 */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) out.push(nested);
    } else {
      out.push(String(value));
    }
  }
  return twMerge(out.join(" "));
}
