/**
 * La taxonomía exactamente como estaba en el código antes de existir la base.
 *
 * `name` es el singular que llevaba cada vehículo, `plural` es como se leía
 * en la navegación y `slug` es lo que ya viajaba en los query strings: los
 * tres se copian literalmente para que ninguna URL compartida deje de
 * funcionar.
 *
 * Se siembran las siete categorías de moto y las seis de carro que el código
 * declaraba, aunque Touring y Scooter no tuvieran vehículos: eran opciones
 * válidas del formulario, no una lista derivada del inventario.
 */
export interface FixtureCategory {
  name: string;
  plural: string;
  slug: string;
  vehicleType: "auto" | "moto";
}

export const fixtureCategories: FixtureCategory[] = [
  { name: "SUV", plural: "SUV", slug: "suv", vehicleType: "auto" },
  { name: "Sedán", plural: "Sedanes", slug: "sedan", vehicleType: "auto" },
  { name: "Híbrido", plural: "Híbridos", slug: "hibrido", vehicleType: "auto" },
  { name: "Eléctrico", plural: "Eléctricos", slug: "electrico", vehicleType: "auto" },
  { name: "Deportivo", plural: "Deportivos", slug: "deportivo", vehicleType: "auto" },
  { name: "4x4", plural: "4x4", slug: "4x4", vehicleType: "auto" },

  { name: "ADV", plural: "ADV", slug: "adv", vehicleType: "moto" },
  { name: "Sport", plural: "Sport", slug: "sport", vehicleType: "moto" },
  { name: "Naked", plural: "Naked", slug: "naked", vehicleType: "moto" },
  { name: "Touring", plural: "Touring", slug: "touring", vehicleType: "moto" },
  { name: "Enduro", plural: "Enduro", slug: "enduro", vehicleType: "moto" },
  { name: "Cruiser", plural: "Cruiser", slug: "cruiser", vehicleType: "moto" },
  { name: "Scooter", plural: "Scooter", slug: "scooter", vehicleType: "moto" },
];
