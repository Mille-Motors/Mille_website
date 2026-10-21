import "server-only";

import { after } from "next/server";
import { socialImageWarmUrl } from "@/lib/seo";
import type { Vehicle } from "@/types/vehicle";

/**
 * Deja lista la imagen de la tarjeta de vista previa de un vehículo recién
 * publicado. Ver `socialImageWarmUrl` para el porqué.
 *
 * Va en `after`: la respuesta al administrador sale primero y esto corre
 * después, sin hacerla esperar. Es un favor, no una obligación: si falla, la
 * primera visita paga la espera, que es lo que pasaba antes.
 *
 * Se pide con la cabecera `Accept` genérica, que es lo que mandan los
 * rastreadores de enlaces. El optimizador guarda una copia por formato, y con
 * esa cabecera la que se guarda es la JPEG que ellos van a pedir, no la WebP
 * que pediría un navegador.
 */
export function warmSocialImage(vehicle: Vehicle): void {
  const url = socialImageWarmUrl(vehicle.images[0], process.env);
  if (!url) return;
  after(async () => {
    try {
      await fetch(url, {
        headers: { Accept: "*/*" },
        signal: AbortSignal.timeout(25_000),
      });
    } catch {
      // Calentar es un favor.
    }
  });
}
