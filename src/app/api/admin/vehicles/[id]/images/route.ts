import { requireSuperadmin } from "@/server/auth/session";
import { parseId } from "@/server/http/params";
import { recordAudit } from "@/server/audit/log";
import { ApiError, badRequest } from "@/server/http/errors";
import { fail, ok, readJson } from "@/server/http/respond";
import { imageOrderSchema } from "@/server/vehicles/schemas";
import {
  addVehicleImages,
  reorderVehicleImages,
} from "@/server/vehicles/images";
import { MAX_IMAGE_BYTES } from "@/server/storage/images";
import { requireVehicle } from "@/server/vehicles/service";
import { revalidateInventory } from "@/server/vehicles/revalidate";

type Params = { params: Promise<{ id: string }> };

/** Tope de la petición completa: doce imágenes de 10 MB ya es mucho. */
const MAX_FILES_PER_REQUEST = 12;

/**
 * Subida de imágenes. Llega como multipart porque son archivos; el tamaño y
 * el tipo real de cada uno los comprueba la capa de storage, no este handler.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireSuperadmin();
    const id = parseId((await params).id, "Ese vehículo");
    await requireVehicle(id);

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      throw new ApiError(
        "UNSUPPORTED_MEDIA_TYPE",
        "Las imágenes se envían como multipart/form-data.",
      );
    }

    const form = await request.formData();
    const files = form
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) throw badRequest("No llegó ninguna imagen.");
    if (files.length > MAX_FILES_PER_REQUEST) {
      throw badRequest(
        `Sube como máximo ${MAX_FILES_PER_REQUEST} imágenes por vez.`,
      );
    }
    const total = files.reduce((sum, file) => sum + file.size, 0);
    if (total > MAX_FILES_PER_REQUEST * MAX_IMAGE_BYTES) {
      throw new ApiError("PAYLOAD_TOO_LARGE", "El envío es demasiado grande.");
    }

    const vehicle = await addVehicleImages(id, files);

    await recordAudit(session, "ADD_VEHICLE_IMAGES", "Vehicle", id, {
      count: files.length,
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
