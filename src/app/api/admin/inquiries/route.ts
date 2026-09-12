import { NextRequest } from "next/server";
import { requireSuperadmin } from "@/server/auth/session";
import { fail, ok } from "@/server/http/respond";
import { adminInquiryQuerySchema } from "@/server/inquiries/schemas";
import { listInquiries } from "@/server/inquiries/service";

export async function GET(request: NextRequest) {
  try {
    await requireSuperadmin();
    const query = adminInquiryQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    return ok(await listInquiries(query));
  } catch (error) {
    return fail(error, "GET /api/admin/inquiries");
  }
}
