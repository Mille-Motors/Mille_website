import { requireSuperadmin } from "@/server/auth/session";
import { recordAudit } from "@/server/audit/log";
import { fail, ok, readJson } from "@/server/http/respond";
import { categoryPatchSchema } from "@/server/categories/schemas";
import { deleteCategory, updateCategory } from "@/server/categories/service";
import { revalidateInventory } from "@/server/vehicles/revalidate";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireSuperadmin();
    const { id } = await params;
    const patch = categoryPatchSchema.parse(await readJson(request));

    const category = await updateCategory(id, patch);

    await recordAudit(session, "UPDATE_CATEGORY", "Category", id, {
      fields: Object.keys(patch),
    });
    revalidateInventory();

    return ok({ category });
  } catch (error) {
    return fail(error, "PATCH /api/admin/categories/[id]");
  }
}

/**
 * Solo se borra una categoría vacía. Si tiene vehículos detrás, el servicio
 * responde 409 y sugiere desactivarla: perderla rompería sus URLs y dejaría
 * los vehículos sin taxonomía.
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await requireSuperadmin();
    const { id } = await params;

    await deleteCategory(id);

    await recordAudit(session, "DELETE_CATEGORY", "Category", id);
    revalidateInventory();

    return ok({ deleted: true });
  } catch (error) {
    return fail(error, "DELETE /api/admin/categories/[id]");
  }
}
