import { z } from "zod";
import { requireSuperadmin } from "@/server/auth/session";
import { parseId } from "@/server/http/params";
import { fail, ok, readJson } from "@/server/http/respond";
import {
  cancelVehicleImageUploads,
  reserveVehicleImageUploads,
} from "@/server/vehicles/images";

type Params = { params: Promise<{ id: string }> };

/**
 * Reservar las rutas antes de que el navegador suba.
 *
 * El cliente dice cuántos archivos y de qué tipo; el servidor autoriza,
 * comprueba el tope por vehículo y DEVUELVE las rutas. El cliente nunca
 * propone una: así no puede escribir fuera de la carpeta de su vehículo ni
 * pisar el objeto de otro.
 *
 * El tipo declarado solo decide la extensión. Lo que vale son los bytes que
 * acaben llegando, y eso se comprueba al registrar.
 */
const reserveSchema = z.object({
  contentTypes: z.array(z.string().trim().min(1).max(100)).min(1).max(20),
});

export async function POST(request: Request, { params }: Params) {
  try {
    await requireSuperadmin();
    const id = parseId((await params).id, "Ese vehículo");
    const { contentTypes } = reserveSchema.parse(await readJson(request));

    return ok(await reserveVehicleImageUploads(id, contentTypes));
  } catch (error) {
    return fail(error, "POST /api/admin/vehicles/[id]/images/reserve");
  }
}

/**
 * Cancelar un lote que no va a terminar.
 *
 * Lo llama el navegador cuando una subida directa falla a mitad: el
 * servidor no tiene forma de enterarse por su cuenta de que esas reservas
 * se quedaron sin usar, y sus objetos ya pueden estar en el bucket.
 *
 * Llegan identificadores, no rutas. El servicio solo carga las reservas de
 * ESTE vehículo, así que un id ajeno simplemente no aparece: cancelar no
 * puede tocar el objeto pendiente de otro.
 */
const cancelSchema = z.object({
  reservationIds: z.array(z.uuid()).min(1).max(20),
});

export async function DELETE(request: Request, { params }: Params) {
  try {
    await requireSuperadmin();
    const id = parseId((await params).id, "Ese vehículo");
    const { reservationIds } = cancelSchema.parse(await readJson(request));

    return ok(await cancelVehicleImageUploads(id, reservationIds));
  } catch (error) {
    return fail(error, "DELETE /api/admin/vehicles/[id]/images/reserve");
  }
}
