import { fail, ok } from "@/server/http/respond";
import { notFound } from "@/server/http/errors";
import { getPublicVehicleBySlug } from "@/server/vehicles/service";

/**
 * Detalle público por slug. Un borrador responde 404 aunque quien pregunte
 * conozca el slug exacto: para el público, no publicado es no existir.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const vehicle = await getPublicVehicleBySlug(slug);
    if (!vehicle) throw notFound("Ese vehículo no existe.");
    return ok({ vehicle });
  } catch (error) {
    return fail(error, "GET /api/vehicles/[slug]");
  }
}
