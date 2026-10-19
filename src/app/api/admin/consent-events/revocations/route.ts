import { requireSuperadmin } from "@/server/auth/session";
import { recordAudit } from "@/server/audit/log";
import { fail, created, readJson } from "@/server/http/respond";
import { consentRevocationSchema } from "@/server/consent/schemas";
import { requestEvidence, revokeConsentForInquiry } from "@/server/consent/service";

/**
 * Registra que un Titular revocó su autorización.
 *
 * No modifica el evento que dice que autorizó —la tabla no lo permite, y no
 * se debe—: añade uno nuevo. El estado vigente de esa persona es su último
 * evento y la historia completa sigue entera.
 *
 * Quedan constancias en DOS sitios y no es duplicación: `ConsentEvent`
 * registra la decisión del Titular, `AdminAuditLog` registra quién del
 * equipo la tecleó. Si alguien discute una revocatoria, lo segundo es lo que
 * dice de dónde salió la anotación.
 */
export async function POST(request: Request) {
  try {
    const session = await requireSuperadmin();
    const input = consentRevocationSchema.parse(await readJson(request));

    await revokeConsentForInquiry(
      input.inquiryId,
      requestEvidence(request),
      session.email,
      input.channel,
    );

    await recordAudit(
      session,
      "REGISTER_CONSENT_REVOCATION",
      "Inquiry",
      input.inquiryId,
      { channel: input.channel, note: input.note ?? null },
    );

    return created({ registered: true });
  } catch (error) {
    return fail(error, "POST /api/admin/consent-events/revocations");
  }
}
