/**
 * Las carrocerías canónicas de un carro.
 *
 * Las categorías son filas administrables —se crean, se renombran y se
 * desactivan desde /admin/categorias— así que la base sigue siendo su fuente
 * de verdad y todos los desplegables las leen de ahí. Lo que vive aquí es
 * distinto: el conjunto con el que MILLE arranca y al que la migración lleva
 * el inventario existente. Es lo que impide que el admin ofrezca una lista y
 * el filtro público otra, porque ambas salen de las mismas filas y esas filas
 * salen de aquí.
 *
 * Por eso NO incluye "Híbrido", "Eléctrico", "Deportivo" ni "4x4": los dos
 * primeros son propulsión (`FUEL_TYPES`), el tercero es carácter
 * (`VEHICLE_TAGS`) y el cuarto es tracción (`DRIVETRAINS`).
 *
 * `slug` es identidad: "suv" y "sedan" se conservan literalmente porque ya
 * viajan en enlaces compartidos y en la banda de la portada.
 */
export interface BodyTypeDefinition {
  name: string;
  /** Cómo se lee en navegación: "Sedanes" para "Sedán". */
  plural: string;
  slug: string;
}

export const AUTO_BODY_TYPES: BodyTypeDefinition[] = [
  { name: "SUV", plural: "SUV", slug: "suv" },
  { name: "Sedán", plural: "Sedanes", slug: "sedan" },
  { name: "Pickup", plural: "Pickups", slug: "pickup" },
  { name: "Hatchback", plural: "Hatchbacks", slug: "hatchback" },
  { name: "Coupé", plural: "Coupés", slug: "coupe" },
  { name: "Cabrio", plural: "Cabrios", slug: "cabrio" },
  { name: "Wagon", plural: "Wagons", slug: "wagon" },
  { name: "Van", plural: "Vans", slug: "van" },
];

/**
 * Las categorías de carro que dejaron de ser carrocerías. Se listan para que
 * la migración sepa cuáles retirar y de cuáles recuperar la información que
 * sí era cierta (la propulsión, la tracción, el carácter).
 */
export const RETIRED_AUTO_BODY_SLUGS = [
  "hibrido",
  "electrico",
  "deportivo",
  "4x4",
] as const;

/** Las carrocerías de moto, que nunca tuvieron el problema y no se tocan. */
export const MOTO_BODY_TYPES: BodyTypeDefinition[] = [
  { name: "ADV", plural: "ADV", slug: "adv" },
  { name: "Sport", plural: "Sport", slug: "sport" },
  { name: "Naked", plural: "Naked", slug: "naked" },
  { name: "Touring", plural: "Touring", slug: "touring" },
  { name: "Enduro", plural: "Enduro", slug: "enduro" },
  { name: "Cruiser", plural: "Cruiser", slug: "cruiser" },
  { name: "Scooter", plural: "Scooter", slug: "scooter" },
];
