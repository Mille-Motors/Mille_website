import "server-only";

import { prisma } from "@/server/db/prisma";
import type { AdminSession } from "@/types/admin";

export type AuditAction =
  | "CREATE_VEHICLE"
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
  | "CREATE_CATEGORY"
  | "UPDATE_CATEGORY"
  | "DELETE_CATEGORY"
  | "UPDATE_INQUIRY"
  | "UPDATE_SITE_MEDIA"
  | "UPDATE_SITE_MEDIA_ALT"
  | "RESET_SITE_MEDIA";

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
