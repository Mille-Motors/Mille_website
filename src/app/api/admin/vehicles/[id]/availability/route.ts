import { requireSuperadmin } from "@/server/auth/session";
import { parseId } from "@/server/http/params";
import { recordAudit } from "@/server/audit/log";
import { fail, ok, readJson } from "@/server/http/respond";
import { availabilitySchema } from "@/server/vehicles/schemas";
import { setAvailability } from "@/server/vehicles/service";
import { revalidateInventory } from "@/server/vehicles/revalidate";

/** Disponible / reservado / vendido. No toca la publicación. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSuperadmin();
    const id = parseId((await params).id, "Ese vehículo");
    const { availability } = availabilitySchema.parse(await readJson(request));

    const vehicle = await setAvailability(id, availability);

    await recordAudit(session, "UPDATE_AVAILABILITY", "Vehicle", id, {
      availability,
    });
    revalidateInventory(vehicle.slug);

    return ok({ vehicle });
  } catch (error) {
    return fail(error, "POST /api/admin/vehicles/[id]/availability");
  }
}
