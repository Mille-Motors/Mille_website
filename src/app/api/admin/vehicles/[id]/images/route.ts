import { z } from "zod";
import { requireSuperadmin } from "@/server/auth/session";
import { parseId } from "@/server/http/params";
import { recordAudit } from "@/server/audit/log";
import { fail, ok, readJson } from "@/server/http/respond";
import { imageOrderSchema } from "@/server/vehicles/schemas";
import {
  registerVehicleImages,
  reorderVehicleImages,
} from "@/server/vehicles/images";
import { revalidateInventory } from "@/server/vehicles/revalidate";

type Params = { params: Promise<{ id: string }> };

/**
 * Registrar las imágenes que el navegador ya subió a Storage.
 *
 * Los BYTES no pasan por aquí. Antes llegaba un multipart con el lote
 * entero —hasta doce archivos de 10 MB en un solo cuerpo— atravesando una
 * función serverless que corta mucho antes; ahora el navegador escribe
 * directo en el bucket, con su propia sesión, y esto solo recibe las rutas.
 *
 * Que la subida la haya hecho el cliente no significa que nos fiemos de
 * ella. Llegan IDENTIFICADORES de reserva, no rutas: el servicio carga las
 * reservas de ESTE vehículo, saca de ahí la ruta y el tipo esperado,
 * descarga la cabecera de cada objeto y valida formato y resolución
 * reales. Si algo no cuadra, retira lo que subió esa tanda — y solo eso.
 */
const registerSchema = z.object({
  // Identificadores, no rutas. El servidor saca la ruta de su propia tabla:
  // una ruta que llega en el cuerpo es un dato del cliente, y tratarla como
  // autoridad permitía que el cierre de un vehículo señalara el objeto
  // pendiente de otro.
  reservationIds: z.array(z.uuid()).min(1).max(20),
});

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireSuperadmin();
    const id = parseId((await params).id, "Ese vehículo");
    const { reservationIds } = registerSchema.parse(await readJson(request));

    const vehicle = await registerVehicleImages(id, reservationIds);

    await recordAudit(session, "ADD_VEHICLE_IMAGES", "Vehicle", id, {
      count: reservationIds.length,
    });
    revalidateInventory(vehicle.slug);

    return ok({ vehicle });
  } catch (error) {
    return fail(error, "POST /api/admin/vehicles/[id]/images");
  }
}

/** Reordenar y renombrar. La posición 0 es la portada. */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireSuperadmin();
    const id = parseId((await params).id, "Ese vehículo");
    const { images } = imageOrderSchema.parse(await readJson(request));

    const vehicle = await reorderVehicleImages(id, images);

    await recordAudit(session, "REORDER_VEHICLE_IMAGES", "Vehicle", id, {
      count: images.length,
    });
    revalidateInventory(vehicle.slug);

    return ok({ vehicle });
  } catch (error) {
    return fail(error, "PATCH /api/admin/vehicles/[id]/images");
  }
}
