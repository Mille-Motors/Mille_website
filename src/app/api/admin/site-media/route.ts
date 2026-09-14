import { requireSuperadmin } from "@/server/auth/session";
import { fail, ok } from "@/server/http/respond";
import { listSiteMedia } from "@/server/site-media/service";

export async function GET() {
  try {
    await requireSuperadmin();
    return ok({ media: await listSiteMedia() });
  } catch (error) {
    return fail(error, "GET /api/admin/site-media");
  }
}
