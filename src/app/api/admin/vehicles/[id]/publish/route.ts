import { requireSuperadmin } from "@/server/auth/session";
import { recordAudit } from "@/server/audit/log";
import { fail, ok, readJson } from "@/server/http/respond";
import { publicationSchema } from "@/server/vehicles/schemas";
import { setPublication } from "@/server/vehicles/service";
import { revalidateInventory } from "@/server/vehicles/revalidate";

const auditFor = {
  published: "PUBLISH_VEHICLE",
  draft: "UNPUBLISH_VEHICLE",
  archived: "ARCHIVE_VEHICLE",
} as const;

/**
 * Publicar, despublicar y archivar son el mismo cambio de estado, así que
 * son el mismo endpoint. Publicar valida requisitos mínimos y responde 409
 * si faltan; despublicar nunca borra nada.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSuperadmin();
    const { id } = await params;
    const { publication } = publicationSchema.parse(await readJson(request));

    const vehicle = await setPublication(id, publication);

    await recordAudit(session, auditFor[publication], "Vehicle", id, {
      slug: vehicle.slug,
    });
    revalidateInventory(vehicle.slug);

    return ok({ vehicle });
  } catch (error) {
    return fail(error, "POST /api/admin/vehicles/[id]/publish");
  }
}
