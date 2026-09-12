import { requireSuperadmin } from "@/server/auth/session";
import { recordAudit } from "@/server/audit/log";
import { fail, ok, readJson } from "@/server/http/respond";
import { vehiclePatchSchema } from "@/server/vehicles/schemas";
import {
  deleteVehicle,
  requireVehicle,
  updateVehicle,
} from "@/server/vehicles/service";
import { revalidateInventory } from "@/server/vehicles/revalidate";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireSuperadmin();
    const { id } = await params;
    return ok({ vehicle: await requireVehicle(id) });
  } catch (error) {
    return fail(error, "GET /api/admin/vehicles/[id]");
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireSuperadmin();
    const { id } = await params;
    const patch = vehiclePatchSchema.parse(await readJson(request));

    const before = await requireVehicle(id);
    const vehicle = await updateVehicle(id, patch);

    await recordAudit(session, "UPDATE_VEHICLE", "Vehicle", id, {
      fields: Object.keys(patch),
    });
    // El slug puede haber cambiado: hay que refrescar la URL vieja y la nueva.
    revalidateInventory(before.slug);
    if (vehicle.slug !== before.slug) revalidateInventory(vehicle.slug);

    return ok({ vehicle });
  } catch (error) {
    return fail(error, "PATCH /api/admin/vehicles/[id]");
  }
}

/**
 * Borrar de verdad solo si no hay nada colgando. Si alguien ya preguntó por
 * el vehículo, el servicio lo archiva y lo dice en la respuesta, para que el
 * admin pueda contar lo que realmente pasó.
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await requireSuperadmin();
    const { id } = await params;
    const vehicle = await requireVehicle(id);
    const { archived } = await deleteVehicle(id);

    await recordAudit(
      session,
      archived ? "ARCHIVE_VEHICLE" : "DELETE_VEHICLE",
      "Vehicle",
      id,
      { slug: vehicle.slug },
    );
    revalidateInventory(vehicle.slug);

    return ok({ archived });
  } catch (error) {
    return fail(error, "DELETE /api/admin/vehicles/[id]");
  }
}
