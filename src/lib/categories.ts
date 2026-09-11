import {
  AUTO_CATEGORIES,
  MOTO_CATEGORIES,
  type VehicleCategory,
  type VehicleType,
} from "@/types/vehicle";

/**
 * Category values are singular because they describe one vehicle. Browse
 * surfaces read better in plural, so the label lives here instead of being
 * special-cased at each call site.
 */
export const categoryPlural: Record<VehicleCategory, string> = {
  SUV: "SUV",
  "Sedán": "Sedanes",
  "Híbrido": "Híbridos",
  "Eléctrico": "Eléctricos",
  Deportivo: "Deportivos",
  "4x4": "4x4",
  ADV: "ADV",
  Sport: "Sport",
  Naked: "Naked",
  Touring: "Touring",
  Enduro: "Enduro",
  Cruiser: "Cruiser",
  Scooter: "Scooter",
};

/** The categories that belong to each universe. */
export function categoriesFor(type: VehicleType): readonly VehicleCategory[] {
  return type === "moto" ? MOTO_CATEGORIES : AUTO_CATEGORIES;
}

/**
 * URL-safe form of a category. Written out rather than derived so the query
 * strings stay stable if a label is ever reworded.
 */
export const categorySlug: Record<VehicleCategory, string> = {
  SUV: "suv",
  "Sedán": "sedan",
  "Híbrido": "hibrido",
  "Eléctrico": "electrico",
  Deportivo: "deportivo",
  "4x4": "4x4",
  ADV: "adv",
  Sport: "sport",
  Naked: "naked",
  Touring: "touring",
  Enduro: "enduro",
  Cruiser: "cruiser",
  Scooter: "scooter",
};

const bySlug = new Map<string, VehicleCategory>(
  ([...AUTO_CATEGORIES, ...MOTO_CATEGORIES] as VehicleCategory[]).map((c) => [
    categorySlug[c],
    c,
  ]),
);

export function categoryFromSlug(slug: string): VehicleCategory | undefined {
  return bySlug.get(slug.toLowerCase());
}

/**
 * How each universe is named in the interface. The public copy says "carro",
 * never "auto", "automóvil" or "motocicleta". The internal value stays
 * `auto` because renaming the model for a copy decision buys nothing.
 */
export const typeLabel: Record<VehicleType, string> = {
  auto: "Carros",
  moto: "Motos",
};

/** Nouns for counters: "1 carro", "6 motos". */
export const typeNoun: Record<VehicleType, { one: string; many: string }> = {
  auto: { one: "carro", many: "carros" },
  moto: { one: "moto", many: "motos" },
};
