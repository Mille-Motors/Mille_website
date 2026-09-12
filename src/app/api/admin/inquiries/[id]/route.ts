import { requireSuperadmin } from "@/server/auth/session";
import { recordAudit } from "@/server/audit/log";
import { fail, ok, readJson } from "@/server/http/respond";
import { inquiryPatchSchema } from "@/server/inquiries/schemas";
import { setInquiryStatus } from "@/server/inquiries/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSuperadmin();
    const { id } = await params;
    const { status } = inquiryPatchSchema.parse(await readJson(request));

    const inquiry = await setInquiryStatus(id, status);

    await recordAudit(session, "UPDATE_INQUIRY", "Inquiry", id, { status });

    return ok({ inquiry });
  } catch (error) {
    return fail(error, "PATCH /api/admin/inquiries/[id]");
  }
}
