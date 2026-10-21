import "server-only";

import { prisma } from "@/server/db/prisma";
import { getPrivacyRequestSummary } from "@/server/privacy/service";
import type { AdminNavBadges } from "@/types/admin";

/**
 * Los avisos numéricos del menú lateral: lo que está esperando a que alguien
 * lo atienda. Son dos y no más —un menú con cinco insignias no destaca
 * ninguna—:
 *
 *   · consultas nuevas, que nadie ha contestado todavía;
 *   · solicitudes de privacidad abiertas, y cuántas de ellas ya vencieron,
 *     porque ahí el plazo es de ley.
 *
 * Si la base no responde, los avisos desaparecen en vez de tumbar el menú de
 * todas las pantallas: es información accesoria, y cada pantalla ya dice por
 * su cuenta si no puede leer sus datos.
 */
const NONE: AdminNavBadges = {
  newInquiries: 0,
  privacyOpen: 0,
  privacyOverdue: 0,
};

export async function getAdminNavBadges(): Promise<AdminNavBadges> {
  try {
    const [newInquiries, privacy] = await Promise.all([
      prisma.inquiry.count({ where: { status: "NEW" } }),
      getPrivacyRequestSummary(),
    ]);
    return {
      newInquiries,
      privacyOpen: privacy.open,
      privacyOverdue: privacy.overdue,
    };
  } catch {
    return NONE;
  }
}
