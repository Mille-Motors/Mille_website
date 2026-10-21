import type { VehicleType } from "@/types/vehicle";

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
 * La portada, las píldoras de /vehiculos y el admin leen esas mismas filas:
 * si hay siete carrocerías de carro, hay siete en los tres sitios, con el
 * mismo nombre, el mismo orden y el mismo dibujo.
 *
 * Por eso NO incluye "Híbrido", "Eléctrico", "Deportivo" ni "4x4": los dos
 * primeros son propulsión (`FUEL_TYPES`), el tercero es carácter
 * (`VEHICLE_TAGS`) y el cuarto es tracción (`DRIVETRAINS`). Un BMW X5
 * enchufable es una camioneta con propulsión híbrida enchufable: dos datos
 * distintos que se combinan, no uno que excluye al otro.
 *
 * «Camioneta» es el nombre con el que en Colombia se pide lo que otros
 * mercados llaman SUV, y también lo que una persona quiere decir con «una
 * 4x4». Son una sola carrocería: lo que distingue a una camioneta de otra
 * —tracción 4x4, carácter off-road— tiene su propia columna. La pickup, en
 * cambio, es otra cosa (lleva platón) y se queda aparte.
 *
 * «Van» no está: MILLE no las vende.
 *
 * `slug` es identidad: viaja en enlaces compartidos. Cuando uno cambia, el
 * viejo se conserva como alias en `BODY_SLUG_ALIASES` para que esos enlaces
 * sigan llevando adonde llevaban.
 */
export interface BodyTypeDefinition {
  name: string;
  /** Cómo se lee en navegación: "Sedanes" para "Sedán". */
  plural: string;
  slug: string;
}

export const AUTO_BODY_TYPES: BodyTypeDefinition[] = [
  { name: "Camioneta", plural: "Camionetas", slug: "camioneta" },
  { name: "Sedán", plural: "Sedanes", slug: "sedan" },
  { name: "Pickup", plural: "Pickups", slug: "pickup" },
  { name: "Hatchback", plural: "Hatchbacks", slug: "hatchback" },
  { name: "Coupé", plural: "Coupés", slug: "coupe" },
  { name: "Cabrio", plural: "Cabrios", slug: "cabrio" },
  { name: "Wagon", plural: "Wagons", slug: "wagon" },
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

// ---------------------------------------------------------------------------
// Compatibilidad con lo que la base todavía pueda tener
// ---------------------------------------------------------------------------
//
// Las migraciones de esta base se aplican a mano, y el código llega a
// producción antes o después que ellas. Si la lógica de abajo supusiera que
// la base ya está migrada, el día que no lo estuviera una camioneta «SUV»
// desaparecería del filtro por una carrera entre dos despliegues. Así que el
// código lee la base como esté: una fila `suv` o `4x4` se trata como la
// camioneta que es, y una fila `van` no se ofrece. Con la migración aplicada,
// todo esto deja de tener nada que hacer.

/**
 * Cómo se llamaban antes las carrocerías que hoy se llaman de otra forma.
 *
 * «suv» y «4x4» eran dos cajones para lo mismo; ahora son «camioneta». Un
 * enlace compartido con `?categoria=suv` sigue funcionando.
 */
export const BODY_SLUG_ALIASES: Readonly<Record<string, string>> = {
  suv: "camioneta",
  "4x4": "camioneta",
};

/**
 * Carrocerías que MILLE no ofrece, aunque su fila siga en la base.
 *
 * Una fila `van` activa —antes de que la migración la retire, o creada de
 * nuevo desde el admin sin querer— no aparece como camino de navegación. Los
 * vehículos que tuviera siguen en el inventario general. Para volver a
 * ofrecerla basta quitarla de esta lista.
 */
export const HIDDEN_BODY_SLUGS: readonly string[] = [
  "van",
  ...RETIRED_AUTO_BODY_SLUGS.filter((slug) => !(slug in BODY_SLUG_ALIASES)),
];

/** El slug vigente de una carrocería, sea cual sea el nombre con que se pida. */
export function canonicalBodySlug(slug: string): string {
  return BODY_SLUG_ALIASES[slug] ?? slug;
}

/**
 * Todos los slugs con los que la base puede guardar una carrocería: el
 * vigente y los que se le fundieron. Es lo que se busca en la consulta, para
 * que «camioneta» encuentre un vehículo cuya fila todavía se llama «suv».
 */
export function slugsFor(slug: string): string[] {
  const canonical = canonicalBodySlug(slug);
  return [
    canonical,
    ...Object.keys(BODY_SLUG_ALIASES).filter((alias) => BODY_SLUG_ALIASES[alias] === canonical),
  ];
}

/**
 * Los slugs de carrocería a los que lleva una palabra escrita en el buscador.
 *
 * «suv» era el nombre de una carrocería y quien lo teclea espera camionetas.
 * «4x4» no entra aquí aunque también fuera una categoría —ahora es tracción, y
 * quien la busca quiere los vehículos con esa tracción, no todas las
 * camionetas—; esa palabra ya se busca en la columna de tracción.
 */
export function searchBodySlugs(word: string): string[] {
  return word === "suv" || word === "camioneta" || word === "camionetas"
    ? slugsFor("camioneta")
    : [];
}

const definitions = new Map<string, BodyTypeDefinition>(
  [...AUTO_BODY_TYPES, ...MOTO_BODY_TYPES].map((body) => [body.slug, body]),
);

interface Named {
  name: string;
  pluralName: string;
  slug: string;
}

/**
 * Una carrocería tal como se enseña: la fila `suv` se lee «Camioneta», con su
 * slug y su plural vigentes. Lo demás pasa tal cual.
 */
export function presentBodyType<T extends Named>(row: T): T {
  const canonical = canonicalBodySlug(row.slug);
  if (canonical === row.slug) return row;
  const definition = definitions.get(canonical);
  return definition
    ? { ...row, slug: canonical, name: definition.name, pluralName: definition.plural }
    : { ...row, slug: canonical };
}

export interface TaxonomyRow extends Named {
  vehicleType: VehicleType;
  position: number;
}

const TYPE_ORDER: Record<VehicleType, number> = { auto: 0, moto: 1 };

/**
 * La lista de carrocerías que se le enseña al público.
 *
 * Funde las filas que son la misma carrocería —`suv` y `4x4` con `camioneta`,
 * sumando sus cuentas si las traen—, quita las que MILLE no ofrece y las deja
 * en su orden. La portada, las píldoras y el filtro pasan por aquí: es lo que
 * las obliga a mostrar lo mismo.
 */
export function mergeBodyTypes<T extends TaxonomyRow>(rows: readonly T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const canonical = canonicalBodySlug(row.slug);
    if (HIDDEN_BODY_SLUGS.includes(canonical)) continue;
    const key = `${row.vehicleType}:${canonical}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const merged = [...groups.values()].map((group) => {
    // Con la migración aplicada hay una sola fila y esto no cambia nada; sin
    // ella, manda la que ya se llama como debe y, si no hay, la primera.
    const lead = group.find((row) => canonicalBodySlug(row.slug) === row.slug) ?? group[0];
    const row = { ...presentBodyType(lead) };
    row.position = Math.min(...group.map((item) => item.position));
    const counts = group.map((item) => (item as { count?: number }).count);
    if (counts.some((count) => count !== undefined)) {
      (row as { count?: number }).count = counts.reduce<number>((sum, count) => sum + (count ?? 0), 0);
    }
    return row;
  });

  return merged.sort(
    (a, b) =>
      TYPE_ORDER[a.vehicleType] - TYPE_ORDER[b.vehicleType] ||
      a.position - b.position ||
      a.name.localeCompare(b.name, "es"),
  );
}
