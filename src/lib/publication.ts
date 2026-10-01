import type { Vehicle } from "@/types/vehicle";

/**
 * Lo mínimo que necesita un vehículo para poder estar en el sitio público.
 *
 * Vive aquí y no en la capa de servicios porque es una función pura sobre el
 * modelo de dominio: no toca la base, la usan tanto el servidor como los
 * tests, y arrastrar `server-only` para esto no aporta nada.
 *
 * Devuelve los motivos en vez de un booleano: cuando publicar se rechaza hay
 * que poder decir qué falta, no solo que no se puede. El formulario los
 * enseña como lista mientras el vehículo sigue en borrador.
 *
 * Desde que un borrador puede estar incompleto, esta función es LA puerta
 * entre lo que se puede guardar y lo que se puede enseñar. Guardar a medias
 * es normal; publicar a medias, imposible.
 *
 * Son DOCE requisitos —marca, modelo, carrocería, año, precio, kilometraje,
 * combustible, transmisión, tracción, ciudad, descripción y al menos una
 * fotografía— y eso no son doce mensajes: marca y modelo comparten uno,
 * porque a quien edita le da igual cuál de los dos falta. La cuenta de
 * mensajes no tiene por qué coincidir con la de requisitos.
 *
 * Y es la ÚNICA puerta. Como la base ya no obliga a rellenar carrocería,
 * combustible, transmisión, tracción ni ciudad —un borrador no puede
 * afirmar lo que nadie ha elegido—, lo que antes garantizaba el `NOT NULL`
 * lo garantiza ahora esta lista. Quitar una línea de aquí no deja un
 * formulario más cómodo: deja una ficha pública con huecos.
 */
/** El año más lejano que se acepta como plausible al publicar. */
const MIN_YEAR = 1900;

export function publicationBlockers(vehicle: Vehicle): string[] {
  const blockers: string[] = [];
  if (!vehicle.make.trim() || !vehicle.model.trim()) {
    blockers.push("Faltan la marca o el modelo.");
  }
  if (!vehicle.category) blockers.push("Falta la carrocería.");
  // Un año fuera de rango no es un borrador a medias: es un error, y en una
  // ficha pública se nota.
  if (
    vehicle.year === null ||
    vehicle.year < MIN_YEAR ||
    vehicle.year > new Date().getFullYear() + 2
  ) {
    blockers.push("Falta el año o no es válido.");
  }
  // `null` es "todavía no se sabe" y 0 es un precio que nadie pondría: las
  // dos cosas impiden publicar, pero solo la primera puede existir en un
  // borrador recién creado.
  if (vehicle.price === null || vehicle.price <= 0) {
    blockers.push("Falta el precio.");
  }
  // En kilometraje solo falta el null: 0 km es legítimo —un importado
  // nuevo— y publicarlo con 0 es correcto.
  if (vehicle.mileage === null) blockers.push("Falta el kilometraje.");
  if (!vehicle.fuelType) blockers.push("Falta el combustible.");
  if (!vehicle.transmission) blockers.push("Falta la transmisión.");
  if (!vehicle.drivetrain) blockers.push("Falta la tracción.");
  if (!vehicle.city?.trim()) blockers.push("Falta la ciudad.");
  if (!vehicle.description.trim()) blockers.push("Falta la descripción.");
  // `placeholder` es la imagen de respaldo que inventa el mapeo cuando no hay
  // ninguna: tener respaldo no es tener foto.
  if (vehicle.images.length === 0 || vehicle.images[0].id === "placeholder") {
    blockers.push("Falta al menos una fotografía.");
  }
  return blockers;
}
