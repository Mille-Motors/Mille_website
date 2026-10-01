import { NextRequest } from "next/server";
import { requireSuperadmin } from "@/server/auth/session";
import { recordAudit } from "@/server/audit/log";
import { parseId } from "@/server/http/params";
import { created, fail, ok } from "@/server/http/respond";
import {
  createDraftVehicle,
  discardDraftVehicle,
} from "@/server/vehicles/service";

/**
 * Un borrador vacío, para poder empezar por las fotografías.
 *
 * No recibe cuerpo: no hay nada que validar todavía. Lo llama el formulario
 * de alta la primera vez que necesita persistir algo —la primera imagen— y
 * nunca al abrir la pantalla, que llenaría la base de filas vacías.
 *
 * Nace en DRAFT, como cualquier alta. El sitio público solo sirve
 * PUBLISHED, así que un borrador vacío es invisible desde fuera por
 * construcción, no por un filtro que alguien pueda olvidar.
 */
export async function POST() {
  try {
    const session = await requireSuperadmin();
    const vehicle = await createDraftVehicle();

    await recordAudit(session, "CREATE_VEHICLE_DRAFT", "Vehicle", vehicle.id, {
      slug: vehicle.slug,
    });

    // No se revalida nada: un borrador vacío no cambia ninguna página
    // pública, y la lista del admin se refresca sola al volver a ella.
    return created({ vehicle });
  } catch (error) {
    return fail(error, "POST /api/admin/vehicles/draft");
  }
}

/**
 * Descartar ese borrador cuando la subida que lo motivó falló.
 *
 * El formulario lo llama solo si acaba de crearlo en esa misma acción: sin
 * esto, un fallo de red al subir la primera foto dejaría una fila vacía en
 * la lista por cada intento.
 *
 * Es un endpoint aparte y no el `DELETE` general del vehículo a propósito:
 * el servicio comprueba que sea un borrador sin solicitudes, así que aunque
 * llegara un identificador equivocado no puede borrar nada publicado.
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSuperadmin();
    const id = parseId(
      request.nextUrl.searchParams.get("id") ?? "",
      "Ese borrador",
    );

    await discardDraftVehicle(id);
    await recordAudit(session, "DISCARD_EMPTY_DRAFT", "Vehicle", id);

    return ok({ discarded: true });
  } catch (error) {
    return fail(error, "DELETE /api/admin/vehicles/draft");
  }
}
