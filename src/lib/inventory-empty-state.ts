/**
 * Qué decir cuando la rejilla del inventario sale vacía.
 *
 * Hay dos vacíos distintos y confundirlos miente. Que MILLE no tenga todavía
 * ningún vehículo publicado es una postura: se espera a tener algo que valga
 * la pena antes de llenar la página. Que unos filtros concretos no devuelvan
 * nada es un dato sobre esa consulta, no sobre la casa — y decir ahí
 * "estamos preparando la primera selección" haría creer que MILLE no tiene
 * inventario cuando sí lo tiene.
 *
 * Por eso el texto se decide a partir del total publicado global, no del
 * tamaño del resultado: el resultado ya se sabe que es cero.
 */
export type InventoryEmptyReason = "launch" | "filters";

export interface InventoryEmptyState {
  reason: InventoryEmptyReason;
  eyebrow: string;
  headline: string;
  body: string;
  secondary: string;
  cta: { label: string; href: string };
  /** Si ofrecer "Limpiar filtros" junto al CTA. */
  showClearFilters: boolean;
}

/**
 * El mismo destino en los dos casos. Sin línea de WhatsApp ni correo, la
 * única conversación que MILLE puede sostener de verdad es el formulario.
 */
const CTA = { label: "Cuéntanos qué estás buscando", href: "/contacto" } as const;

/** En minúsculas: la versaleta la pone la tipografía, no el contenido. */
const EYEBROW = "El inventario de hoy";

const COPY: Record<InventoryEmptyReason, Omit<InventoryEmptyState, "showClearFilters">> = {
  launch: {
    reason: "launch",
    eyebrow: EYEBROW,
    headline: "No publicamos por llenar espacio.",
    body: "Esperamos hasta encontrar vehículos que valga la pena mirar dos veces.",
    secondary: "Estamos preparando la primera selección de MILLE.",
    cta: CTA,
  },
  filters: {
    reason: "filters",
    eyebrow: EYEBROW,
    headline: "Todavía no encontramos el indicado.",
    body: "No hay vehículos que encajen con estos filtros.",
    secondary: "Prueba otra combinación o cuéntanos qué estás buscando.",
    cta: CTA,
  },
};

export function inventoryEmptyReason(publishedTotal: number): InventoryEmptyReason {
  return publishedTotal === 0 ? "launch" : "filters";
}

export function inventoryEmptyState({
  publishedTotal,
  activeFilters,
}: {
  /** Vehículos PUBLISHED en todo el inventario, no en esta consulta. */
  publishedTotal: number;
  /** Filtros aplicados sin contar el universo (`activeFilterCount`). */
  activeFilters: number;
}): InventoryEmptyState {
  const reason = inventoryEmptyReason(publishedTotal);

  return {
    ...COPY[reason],
    // Limpiar filtros solo sirve si al quitarlos puede aparecer algo. Sin
    // nada publicado seguiría dando cero, y un botón que no cambia el
    // resultado es una promesa falsa; con filtros activos y algo publicado,
    // es la salida real del callejón.
    showClearFilters: reason === "filters" && activeFilters > 0,
  };
}
