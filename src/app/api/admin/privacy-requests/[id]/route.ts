import { requireSuperadmin } from "@/server/auth/session";
import { recordAudit } from "@/server/audit/log";
import { parseId } from "@/server/http/params";
import { fail, ok, readJson } from "@/server/http/respond";
import { privacyRequestPatchSchema } from "@/server/privacy/schemas";
import { updatePrivacyRequest } from "@/server/privacy/service";

type Params = { params: Promise<{ id: string }> };

/**
 * Atiende un trámite: estado, notas, respuesta, identidad verificada.
 *
 * No hay DELETE. Un expediente de derechos no se borra: es la prueba de que
 * MILLE atendió —o no— una solicitud con un plazo legal, y es justo lo que
 * habría que enseñar si alguien dice que no se le respondió.
 *
 * La auditoría guarda QUÉ campos se tocaron y el estado resultante, no el
 * texto de las notas: lo que hay que poder reconstruir es quién movió el
 * trámite y hacia dónde, y el contenido ya está en el propio expediente.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireSuperadmin();
    const id = parseId((await params).id, "Esa solicitud de privacidad");
    const patch = privacyRequestPatchSchema.parse(await readJson(request));

    const privacyRequest = await updatePrivacyRequest(id, patch);

    await recordAudit(
      session,
      "UPDATE_PRIVACY_REQUEST",
      "PrivacyRequest",
      id,
      {
        changed: Object.keys(patch),
        status: privacyRequest.status,
        identityVerified: privacyRequest.identityVerified,
        closedAt: privacyRequest.closedAt,
      },
    );

    return ok({ privacyRequest });
  } catch (error) {
    return fail(error, "PATCH /api/admin/privacy-requests/[id]");
  }
}
