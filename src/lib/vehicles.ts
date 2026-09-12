import "server-only";

import {
  getInventoryFacets,
  getPublicVehicleBySlug,
  listFeaturedVehicles,
  listPublicVehicleSlugs,
  listPublicVehicles,
  listRelatedVehicles,
  type PublicVehicleQuery,
} from "@/server/vehicles/service";
import type { Vehicle } from "@/types/vehicle";

/**
 * La única frontera entre la interfaz pública y el inventario.
 *
 * Antes resolvía desde un módulo de datos de demostración; ahora resuelve
 * desde PostgreSQL a través de la capa de servicios. Las firmas no han
 * cambiado, que era justamente el punto de tener esta capa.
 *
 * No hay ningún `catch` que devuelva datos de demostración si la base falla:
 * un inventario inventado escondería una caída de producción. Si la consulta
 * falla, la página falla y se ve.
 */

export type { PublicVehicleQuery as VehicleQuery };
export type { InventoryFacets } from "@/server/vehicles/service";

export async function getVehicles(
  query: PublicVehicleQuery = {},
): Promise<Vehicle[]> {
  return listPublicVehicles(query);
}

export async function getFeaturedVehicles(limit = 4): Promise<Vehicle[]> {
  return listFeaturedVehicles(limit);
}

export async function getVehicleBySlug(slug: string): Promise<Vehicle | null> {
  return getPublicVehicleBySlug(slug);
}

export async function getRelatedVehicles(
  vehicle: Vehicle,
  limit = 3,
): Promise<Vehicle[]> {
  return listRelatedVehicles(vehicle, limit);
}

export async function getAllVehicleSlugs(): Promise<string[]> {
  return listPublicVehicleSlugs();
}

export async function getFilterFacets(
  type: Parameters<typeof getInventoryFacets>[0] = "all",
) {
  return getInventoryFacets(type);
}
