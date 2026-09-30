import {
  AUTO_BODY_TYPES,
  MOTO_BODY_TYPES,
  type BodyTypeDefinition,
} from "../../src/lib/body-types";

/**
 * Las carrocerías con las que arranca una base vacía.
 *
 * No están escritas aquí: se leen de src/lib/body-types.ts, que es la misma
 * definición que usó la migración de taxonomía. Duplicarlas era justamente
 * la causa del problema que esa migración corrige —el admin ofrecía una
 * lista y el filtro público otra—, así que el seed no puede tener su propia
 * copia.
 *
 * Lo que sí desapareció de esta lista: "Híbrido", "Eléctrico", "Deportivo" y
 * "4x4". No eran carrocerías. Sembrarlas de nuevo en una base limpia
 * reintroduciría el error en cada entorno nuevo.
 */
export interface FixtureCategory {
  name: string;
  plural: string;
  slug: string;
  vehicleType: "auto" | "moto";
}

const toFixture = (
  vehicleType: "auto" | "moto",
): ((body: BodyTypeDefinition) => FixtureCategory) =>
  (body) => ({
    name: body.name,
    plural: body.plural,
    slug: body.slug,
    vehicleType,
  });

export const fixtureCategories: FixtureCategory[] = [
  ...AUTO_BODY_TYPES.map(toFixture("auto")),
  ...MOTO_BODY_TYPES.map(toFixture("moto")),
];
