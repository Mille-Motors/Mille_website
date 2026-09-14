import { NextRequest } from "next/server";
import { requireSuperadmin } from "@/server/auth/session";
import { recordAudit } from "@/server/audit/log";
import { fail, ok, readJson } from "@/server/http/respond";
import {
  inquiryDeleteReasonSchema,
  inquiryPatchSchema,
} from "@/server/inquiries/schemas";
import { deleteInquiry, setInquiryStatus } from "@/server/inquiries/service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
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

/**
 * Borrado definitivo.
 *
 * `?reason=spam` distingue "esto era basura" de "esto ya está resuelto y no
 * hace falta guardarlo". Marcar spam y borrar en el mismo gesto se registra
 * directamente como DELETE_SPAM_INQUIRY: persistir el estado SPAM para
 * borrarlo un instante después sería un viaje a la base que no aporta nada,
 * y el motivo queda igual de claro en la auditoría.
 *
 * Los datos de la persona NO se copian al registro. Lo que se borra se borra;
 * quedan el id, el tipo y el estado previo, que es lo que permite rendir
 * cuentas de la acción sin conservar el contacto de alguien que ya no está.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await requireSuperadmin();
    const { id } = await params;
    const reason = inquiryDeleteReasonSchema.parse(
      request.nextUrl.searchParams.get("reason") ?? undefined,
    );

    const inquiry = await deleteInquiry(id);

    await recordAudit(
      session,
      reason === "spam" ? "DELETE_SPAM_INQUIRY" : "DELETE_INQUIRY",
      "Inquiry",
      id,
      {
        type: inquiry.type,
        previousStatus: inquiry.status,
        hadVehicle: inquiry.vehicleId !== null,
      },
    );

    return ok({ deleted: true });
  } catch (error) {
    return fail(error, "DELETE /api/admin/inquiries/[id]");
  }
}
