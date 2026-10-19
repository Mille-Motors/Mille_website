import { NextRequest } from "next/server";
import { requireSuperadmin } from "@/server/auth/session";
import { fail, ok } from "@/server/http/respond";
import { adminConsentQuerySchema } from "@/server/consent/schemas";
import { listConsentEvents } from "@/server/consent/service";

/**
 * La evidencia de consentimiento, solo para SUPERADMIN.
 *
 * No hay POST: los eventos los escribe el flujo que los origina —el envío de
 * un formulario, o el registro de una revocatoria— y no un endpoint genérico
 * al que se le pueda pedir que invente uno.
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperadmin();
    const query = adminConsentQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    return ok(await listConsentEvents(query));
  } catch (error) {
    return fail(error, "GET /api/admin/consent-events");
  }
}
