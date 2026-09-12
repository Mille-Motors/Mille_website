import "server-only";

import { slugify, vehicleTitle } from "@/lib/format";
import { prisma } from "@/server/db/prisma";

/**
 * Los slugs son la URL pública de un vehículo: tienen que ser únicos,
 * estables y legibles. La base preferida es marca + modelo + versión, que es
 * lo que ya usaban los 22 vehículos del inventario original.
 *
 * Las colisiones se resuelven con un sufijo numérico en vez de fallar: dos
 * carros iguales son un caso normal en un concesionario, no un error.
 */
export async function uniqueVehicleSlug(
  base: { make: string; model: string; version: string },
  options: { excludeId?: string; preferred?: string } = {},
): Promise<string> {
  const seed = slugify(options.preferred || vehicleTitle(base)) || "vehiculo";

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? seed : `${seed}-${attempt + 1}`;
    const existing = await prisma.vehicle.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === options.excludeId) return candidate;
  }

  // Con 50 homónimos, algo raro pasa: un sufijo aleatorio es mejor que un
  // bucle infinito o que devolver un slug ya ocupado.
  return `${seed}-${Date.now().toString(36)}`;
}
