import "server-only";

import { prisma } from "@/server/db/prisma";
import type { AdminSession } from "@/types/admin";

export type AuditAction =
  | "CREATE_VEHICLE"
  /** Borrador vacío creado para poder empezar por las fotografías. */
  | "CREATE_VEHICLE_DRAFT"
  /** Ese mismo borrador, descartado porque la subida falló. */
  | "DISCARD_EMPTY_DRAFT"
  | "UPDATE_VEHICLE"
  | "PUBLISH_VEHICLE"
  | "UNPUBLISH_VEHICLE"
  | "ARCHIVE_VEHICLE"
  | "RESTORE_VEHICLE"
  | "DELETE_VEHICLE"
  | "UPDATE_AVAILABILITY"
  | "ADD_VEHICLE_IMAGES"
  | "DELETE_VEHICLE_IMAGE"
  | "REORDER_VEHICLE_IMAGES"
  /** Qué parte de una fotografía se ve. No cambia el archivo ni el orden. */
  | "UPDATE_VEHICLE_IMAGE_FOCAL"
  | "CREATE_CATEGORY"
  | "UPDATE_CATEGORY"
  | "DELETE_CATEGORY"
  | "UPDATE_INQUIRY"
  | "DELETE_INQUIRY"
  | "DELETE_SPAM_INQUIRY"
  | "UPDATE_SITE_MEDIA"
  | "UPDATE_SITE_MEDIA_ALT"
  | "UPDATE_SITE_MEDIA_FOCAL"
  | "RESET_SITE_MEDIA"
  // De dónde salió una fotografía. No cambia el archivo ni lo que se ve.
  | "UPDATE_VEHICLE_PROVENANCE"
  | "UPDATE_VEHICLE_IMAGE_PROVENANCE"
  | "UPDATE_SITE_MEDIA_PROVENANCE"
  // Trámites de derechos del Titular. La acción administrativa va aquí; la
  // decisión del Titular va a `ConsentEvent`, que es otra cosa.
  | "CREATE_PRIVACY_REQUEST"
  | "UPDATE_PRIVACY_REQUEST"
  /**
   * Una revocatoria registrada por el equipo. Deja constancia de QUIÉN la
   * registró; el evento de consentimiento deja constancia de que el Titular
   * la pidió. Son dos hechos distintos y por eso están en dos sitios.
   */
  | "REGISTER_CONSENT_REVOCATION"
  /**
   * Quién se llevó la evidencia y con qué filtro. Exportar consentimientos
   * es sacar IPs y datos de contacto del panel: es justo el tipo de acción
   * que un registro de auditoría existe para recordar.
   */
  | "EXPORT_CONSENT_EVENTS";

/**
 * Quién hizo qué. Nunca hace fallar la operación que registra: perder una
 * línea de auditoría es molesto, perder el cambio del usuario porque la
 * auditoría falló es peor.
 */
export async function recordAudit(
  session: AdminSession,
  action: AuditAction,
  entityType: string,
  entityId: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: session.adminUserId,
        adminEmail: session.email,
        action,
        entityType,
        entityId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });
  } catch (error) {
    console.error("[mille:audit] no se pudo registrar la acción", {
      action,
      entityType,
      entityId,
      error,
    });
  }
}
