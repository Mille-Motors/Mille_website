import { requireSuperadmin } from "@/server/auth/session";
import { recordAudit } from "@/server/audit/log";
import { parseId } from "@/server/http/params";
import { fail, ok, readJson } from "@/server/http/respond";
import { imageRightsPatchSchema } from "@/server/provenance/schemas";
import { setVehicleImageRights } from "@/server/provenance/service";

type Params = { params: Promise<{ id: string; imageId: string }> };

/**
 * La procedencia de UNA fotografía, cuando no es la del lote.
 *
 * Existe para el caso real: veintitrés fotos del propietario y una del
 * fabricante. Mientras no haya override, la fotografía hereda la del
 * vehículo y nadie tiene que rellenar nada dos veces.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireSuperadmin();
    const { id: rawId, imageId: rawImageId } = await params;
    const id = parseId(rawId, "Ese vehículo");
    const imageId = parseId(rawImageId, "Esa imagen");
    const { rights } = imageRightsPatchSchema.parse(await readJson(request));

    const provenance = await setVehicleImageRights(id, imageId, rights);

    await recordAudit(
      session,
      "UPDATE_VEHICLE_IMAGE_PROVENANCE",
      "VehicleImage",
      imageId,
      {
        vehicleId: id,
        sourceType: rights?.sourceType ?? null,
        cleared: rights === null,
      },
    );

    return ok({ provenance });
  } catch (error) {
    return fail(error, "PATCH /api/admin/vehicles/[id]/images/[imageId]/provenance");
  }
}
