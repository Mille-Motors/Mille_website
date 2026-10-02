import { z } from "zod";
import { requireSuperadmin } from "@/server/auth/session";
import { parseId } from "@/server/http/params";
import { recordAudit } from "@/server/audit/log";
import { fail, ok, readJson } from "@/server/http/respond";
import { focalSchema } from "@/server/media/focal";
import {
  deleteVehicleImage,
  setVehicleImageFocal,
} from "@/server/vehicles/images";
import { revalidateInventory } from "@/server/vehicles/revalidate";

type Params = { params: Promise<{ id: string; imageId: string }> };

/**
 * El encuadre de UNA fotografía.
 *
 * Vive aquí y no en el endpoint de subida, ni en el PATCH que reordena la
 * galería, porque es otra decisión: no cambia qué fotografías hay ni en qué
 * orden están, solo qué parte de una de ellas se ve. Mezclarlo con la subida
 * habría obligado a mandar un cuerpo que habla de archivos para no tocar
 * ninguno.
 *
 * No existe "formato": el marco es siempre el horizontal del sitio. Lo único
 * que viaja son los dos porcentajes, y el servicio comprueba además que la
 * imagen sea de este vehículo.
 */
const patchSchema = z.object({ focal: focalSchema });

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireSuperadmin();
    const { id: rawId, imageId: rawImageId } = await params;
    const id = parseId(rawId, "Ese vehículo");
    const imageId = parseId(rawImageId, "Esa imagen");

    const { focal } = patchSchema.parse(await readJson(request));
    const vehicle = await setVehicleImageFocal(id, imageId, focal);

    await recordAudit(
      session,
      "UPDATE_VEHICLE_IMAGE_FOCAL",
      "VehicleImage",
      imageId,
      { vehicleId: id, focalX: focal.x, focalY: focal.y },
    );
    revalidateInventory(vehicle.slug);

    return ok({ vehicle });
  } catch (error) {
    return fail(error, "PATCH /api/admin/vehicles/[id]/images/[imageId]");
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await requireSuperadmin();
    const { id: rawId, imageId: rawImageId } = await params;
    const id = parseId(rawId, "Ese vehículo");
    const imageId = parseId(rawImageId, "Esa imagen");

    const vehicle = await deleteVehicleImage(id, imageId);

    await recordAudit(session, "DELETE_VEHICLE_IMAGE", "VehicleImage", imageId, {
      vehicleId: id,
    });
    revalidateInventory(vehicle.slug);

    return ok({ vehicle });
  } catch (error) {
    return fail(error, "DELETE /api/admin/vehicles/[id]/images/[imageId]");
  }
}
