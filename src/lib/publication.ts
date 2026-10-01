import { usesDrivetrain, usesFinalDrive } from "@/types/vehicle";
import type { VehicleType } from "@/types/vehicle";

/**
 * Lo que hace falta mirar para decidir si algo puede publicarse.
 *
 * Es más estrecho que `Vehicle` a propósito. El formulario necesita
 * responder la pregunta sobre lo que el administrador TIENE DELANTE —su
 * borrador sin guardar— y no sobre la copia que el servidor devolvió la
 * última vez; con `Vehicle` entero no podía, porque el borrador no es un
 * `Vehicle`. Un `Vehicle` encaja aquí por forma, sin convertir nada.
 */
export interface PublicationCandidate {
  vehicleType: VehicleType;
  make: string;
  model: string;
  category: { id: string } | null;
  year: number | null;
  price: number | null;
  mileage: number | null;
  fuelType: string | null;
  transmission: string | null;
  drivetrain: string | null;
  finalDrive: string | null;
  city: string | null;
  description: string;
  images: { id: string }[];
}

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
 * La lista DEPENDE DEL TIPO. Once requisitos son comunes —marca, modelo,
 * categoría, año, precio, kilometraje, combustible, transmisión, ciudad,
 * descripción y al menos una fotografía— y el duodécimo cambia de universo:
 * un carro necesita tracción y una moto, transmisión final. Exigirle a una
 * moto la tracción integral de un carro la dejaba bloqueada por un campo
 * que su propio formulario ni siquiera le muestra.
 *
 * Doce requisitos tampoco son doce mensajes: marca y modelo comparten uno,
 * porque a quien edita le da igual cuál de los dos falta.
 *
 * Y es la ÚNICA puerta. Como la base ya no obliga a rellenar carrocería,
 * combustible, transmisión, tracción ni ciudad —un borrador no puede
 * afirmar lo que nadie ha elegido—, lo que antes garantizaba el `NOT NULL`
 * lo garantiza ahora esta lista. Quitar una línea de aquí no deja un
 * formulario más cómodo: deja una ficha pública con huecos.
 */
/** El año más lejano que se acepta como plausible al publicar. */
const MIN_YEAR = 1900;

export function publicationBlockers(vehicle: PublicationCandidate): string[] {
  const blockers: string[] = [];
  if (!vehicle.make.trim() || !vehicle.model.trim()) {
    blockers.push("Faltan la marca o el modelo.");
  }
  if (!vehicle.category) {
    blockers.push(
      vehicle.vehicleType === "moto"
        ? "Falta el tipo de moto."
        : "Falta la carrocería.",
    );
  }
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
  // El duodécimo requisito, y el único que cambia de universo.
  if (usesDrivetrain(vehicle.vehicleType) && !vehicle.drivetrain) {
    blockers.push("Falta la tracción.");
  }
  if (usesFinalDrive(vehicle.vehicleType) && !vehicle.finalDrive) {
    blockers.push("Falta la transmisión final.");
  }
  if (!vehicle.city?.trim()) blockers.push("Falta la ciudad.");
  if (!vehicle.description.trim()) blockers.push("Falta la descripción.");
  // `placeholder` es la imagen de respaldo que inventa el mapeo cuando no hay
  // ninguna: tener respaldo no es tener foto.
  if (vehicle.images.length === 0 || vehicle.images[0].id === "placeholder") {
    blockers.push("Falta al menos una fotografía.");
  }
  return blockers;
}
