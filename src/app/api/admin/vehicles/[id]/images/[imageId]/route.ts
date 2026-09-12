import { requireSuperadmin } from "@/server/auth/session";
import { recordAudit } from "@/server/audit/log";
import { fail, ok } from "@/server/http/respond";
import { deleteVehicleImage } from "@/server/vehicles/images";
import { revalidateInventory } from "@/server/vehicles/revalidate";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  try {
    const session = await requireSuperadmin();
    const { id, imageId } = await params;

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
