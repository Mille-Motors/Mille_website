import { requireSuperadmin } from "@/server/auth/session";
import { recordAudit } from "@/server/audit/log";
import { parseId } from "@/server/http/params";
import { fail, ok, readJson } from "@/server/http/respond";
import { imageRightsPatchSchema } from "@/server/provenance/schemas";
import {
  getVehicleProvenance,
  setVehicleRights,
} from "@/server/provenance/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireSuperadmin();
    const id = parseId((await params).id, "Ese vehículo");
    return ok({ provenance: await getVehicleProvenance(id) });
  } catch (error) {
    return fail(error, "GET /api/admin/vehicles/[id]/provenance");
  }
}

/**
 * La procedencia del LOTE fotográfico de un vehículo.
 *
 * No toca el archivo, ni la URL, ni la posición, ni el texto alternativo, ni
 * la publicación: registrar de dónde salieron las fotos no cambia ninguna
 * foto. Por eso tiene su propio endpoint y no pasa por el del vehículo, que
 * tiene que revalidar superficies públicas.
 *
 * `rights: null` devuelve el lote al estado pendiente. Corregir un registro
 * equivocado no puede obligar a inventar otro.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireSuperadmin();
    const id = parseId((await params).id, "Ese vehículo");
    const { rights } = imageRightsPatchSchema.parse(await readJson(request));

    const provenance = await setVehicleRights(id, rights);

    await recordAudit(session, "UPDATE_VEHICLE_PROVENANCE", "Vehicle", id, {
      sourceType: rights?.sourceType ?? null,
      cleared: rights === null,
      pendingImages: provenance.pendingCount,
    });

    return ok({ provenance });
  } catch (error) {
    return fail(error, "PATCH /api/admin/vehicles/[id]/provenance");
  }
}
