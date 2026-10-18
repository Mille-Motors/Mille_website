import "server-only";

import { prisma } from "@/server/db/prisma";
import type { WhatsappClickInput } from "@/server/whatsapp/schemas";

export async function recordWhatsappClick(
  input: WhatsappClickInput,
): Promise<void> {
  await prisma.whatsappClick.create({
    data: {
      source: input.source,
      intent: input.intent ?? null,
      vehicleSlug: input.vehicleSlug ?? null,
      // Sin parámetros ni ancla: la página, no la sesión de nadie.
      path: input.path.split(/[?#]/)[0]!,
    },
  });
}

export interface WhatsappClickStats {
  last7Days: number;
  last30Days: number;
  total: number;
  /** Los vehículos que más preguntas han movido en los últimos 30 días. */
  topVehicles: { slug: string; clicks: number }[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Las cifras del dashboard.
 *
 * Devuelve `null` si no se pueden leer —típicamente porque la migración
 * `whatsapp_clicks` todavía no se aplicó en esa base—. El dashboard entonces
 * esconde la sección en vez de caerse: un conteo que falta no debe tumbar el
 * resumen del inventario.
 */
export async function getWhatsappClickStats(
  now = new Date(),
): Promise<WhatsappClickStats | null> {
  try {
    const since7 = new Date(now.getTime() - 7 * DAY_MS);
    const since30 = new Date(now.getTime() - 30 * DAY_MS);

    const [last7Days, last30Days, total, top] = await Promise.all([
      prisma.whatsappClick.count({ where: { createdAt: { gte: since7 } } }),
      prisma.whatsappClick.count({ where: { createdAt: { gte: since30 } } }),
      prisma.whatsappClick.count(),
      prisma.whatsappClick.groupBy({
        by: ["vehicleSlug"],
        where: { createdAt: { gte: since30 }, vehicleSlug: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { vehicleSlug: "desc" } },
        take: 5,
      }),
    ]);

    return {
      last7Days,
      last30Days,
      total,
      topVehicles: top.flatMap((row) =>
        row.vehicleSlug ? [{ slug: row.vehicleSlug, clicks: row._count._all }] : [],
      ),
    };
  } catch (error) {
    console.error("getWhatsappClickStats", error);
    return null;
  }
}
