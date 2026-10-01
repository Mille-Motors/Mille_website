import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/server/http/respond";
import { listPublicVehicles } from "@/server/vehicles/service";
import { VEHICLE_TYPES } from "@/types/vehicle";

/**
 * Inventario público. Solo devuelve vehículos publicados: eso lo garantiza
 * el servicio, no este handler, así que no hay ningún parámetro capaz de
 * sacar un borrador por aquí.
 */
const querySchema = z.object({
  tipo: z.enum(VEHICLE_TYPES).optional(),
  /** La carrocería, por slug. El nombre del parámetro no cambia. */
  categoria: z.string().trim().max(60).optional(),
  marca: z.string().trim().max(60).optional(),
  modelo: z.string().trim().max(60).optional(),
  combustible: z.string().trim().max(60).optional(),
  transmision: z.string().trim().max(60).optional(),
  traccion: z.string().trim().max(60).optional(),
  transmisionFinal: z.string().trim().max(60).optional(),
  ciudad: z.string().trim().max(80).optional(),
  etiqueta: z.string().trim().max(60).optional(),
  minYear: z.coerce.number().int().min(1900).max(2100).optional(),
  maxYear: z.coerce.number().int().min(1900).max(2100).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  maxKm: z.coerce.number().int().min(0).max(2_000_000).optional(),
  destacados: z.enum(["true", "false"]).optional(),
  orden: z
    .enum(["recent", "price-asc", "price-desc", "mileage-asc", "year-desc"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const params = querySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    const vehicles = await listPublicVehicles({
      vehicleType: params.tipo,
      categorySlug: params.categoria,
      make: params.marca,
      model: params.modelo,
      fuelType: params.combustible,
      transmission: params.transmision,
      drivetrain: params.traccion,
      finalDrive: params.transmisionFinal,
      city: params.ciudad,
      tag: params.etiqueta,
      minYear: params.minYear,
      maxYear: params.maxYear,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      maxMileage: params.maxKm,
      featured: params.destacados ? params.destacados === "true" : undefined,
      sort: params.orden,
      limit: params.limit,
    });

    return ok({ vehicles, total: vehicles.length });
  } catch (error) {
    return fail(error, "GET /api/vehicles");
  }
}
