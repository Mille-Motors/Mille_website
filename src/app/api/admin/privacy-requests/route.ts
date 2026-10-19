import { NextRequest } from "next/server";
import { requireSuperadmin } from "@/server/auth/session";
import { recordAudit } from "@/server/audit/log";
import { fail, created, ok, readJson } from "@/server/http/respond";
import {
  adminPrivacyQuerySchema,
  privacyRequestCreateSchema,
} from "@/server/privacy/schemas";
import {
  createPrivacyRequest,
  listPrivacyRequests,
} from "@/server/privacy/service";

export async function GET(request: NextRequest) {
  try {
    await requireSuperadmin();
    const query = adminPrivacyQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    return ok(await listPrivacyRequests(query));
  } catch (error) {
    return fail(error, "GET /api/admin/privacy-requests");
  }
}

/**
 * Registra una solicitud que llegó por correo o WhatsApp.
 *
 * La auditoría guarda el tipo, el canal y el vencimiento calculado, no los
 * datos del titular: para rendir cuentas de la acción basta saber qué se
 * registró y cuándo vence, y copiar el correo de alguien a una segunda tabla
 * es tener su dato en dos sitios para no ganar nada.
 */
export async function POST(request: Request) {
  try {
    const session = await requireSuperadmin();
    const input = privacyRequestCreateSchema.parse(await readJson(request));

    const privacyRequest = await createPrivacyRequest(input);

    await recordAudit(
      session,
      "CREATE_PRIVACY_REQUEST",
      "PrivacyRequest",
      privacyRequest.id,
      {
        type: privacyRequest.type,
        channel: privacyRequest.channel,
        track: privacyRequest.track,
        receivedOn: privacyRequest.receivedOn,
        dueOn: privacyRequest.dueOn,
      },
    );

    return created({ privacyRequest });
  } catch (error) {
    return fail(error, "POST /api/admin/privacy-requests");
  }
}
