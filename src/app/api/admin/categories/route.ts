import { requireSuperadmin } from "@/server/auth/session";
import { recordAudit } from "@/server/audit/log";
import { created, fail, ok, readJson } from "@/server/http/respond";
import { categoryInputSchema } from "@/server/categories/schemas";
import {
  createCategory,
  listCategoriesWithCounts,
} from "@/server/categories/service";
import { revalidateInventory } from "@/server/vehicles/revalidate";

export async function GET() {
  try {
    await requireSuperadmin();
    return ok({ categories: await listCategoriesWithCounts() });
  } catch (error) {
    return fail(error, "GET /api/admin/categories");
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSuperadmin();
    const input = categoryInputSchema.parse(await readJson(request));
    const category = await createCategory(input);

    await recordAudit(session, "CREATE_CATEGORY", "Category", category.id, {
      slug: category.slug,
    });
    revalidateInventory();

    return created({ category });
  } catch (error) {
    return fail(error, "POST /api/admin/categories");
  }
}
