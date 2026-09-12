import { NextRequest } from "next/server";
import { requireSuperadmin } from "@/server/auth/session";
import { recordAudit } from "@/server/audit/log";
import { created, fail, ok, readJson } from "@/server/http/respond";
import {
  adminVehicleQuerySchema,
  vehicleInputSchema,
} from "@/server/vehicles/schemas";
import { createVehicle, listAdminVehicles } from "@/server/vehicles/service";
import { revalidateInventory } from "@/server/vehicles/revalidate";

/**
 * Todos los handlers de /api/admin siguen la misma secuencia: autorizar,
 * validar, llamar al servicio, serializar. La lógica de negocio no vive
 * aquí, y la autorización no depende de que el proxy haya redirigido.
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperadmin();
    const query = adminVehicleQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    return ok(await listAdminVehicles(query));
  } catch (error) {
    return fail(error, "GET /api/admin/vehicles");
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSuperadmin();
    const input = vehicleInputSchema.parse(await readJson(request));
    const vehicle = await createVehicle(input);

    await recordAudit(session, "CREATE_VEHICLE", "Vehicle", vehicle.id, {
      slug: vehicle.slug,
    });
    // Nace en borrador, así que el público no cambia todavía; se revalida de
    // todos modos porque el admin sí lista desde las mismas rutas.
    revalidateInventory(vehicle.slug);

    return created({ vehicle });
  } catch (error) {
    return fail(error, "POST /api/admin/vehicles");
  }
}
