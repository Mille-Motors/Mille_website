import type { Vehicle } from "@/types/vehicle";

/**
 * Lo mínimo que necesita un vehículo para poder estar en el sitio público.
 *
 * Vive aquí y no en la capa de servicios porque es una función pura sobre el
 * modelo de dominio: no toca la base, la usan tanto el servidor como los
 * tests, y arrastrar `server-only` para esto no aporta nada.
 *
 * Devuelve los motivos en vez de un booleano: cuando publicar se rechaza hay
 * que poder decir qué falta, no solo que no se puede.
 */
export function publicationBlockers(vehicle: Vehicle): string[] {
  const blockers: string[] = [];
  if (!vehicle.make.trim() || !vehicle.model.trim()) {
    blockers.push("Faltan la marca o el modelo.");
  }
  if (vehicle.price <= 0) blockers.push("Falta el precio.");
  if (!vehicle.description.trim()) blockers.push("Falta la descripción.");
  // `placeholder` es la imagen de respaldo que inventa el mapeo cuando no hay
  // ninguna: tener respaldo no es tener foto.
  if (vehicle.images.length === 0 || vehicle.images[0].id === "placeholder") {
    blockers.push("Falta al menos una fotografía.");
  }
  return blockers;
}
