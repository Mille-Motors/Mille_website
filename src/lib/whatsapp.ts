import { site } from "@/data/site";
import { formatCOP, vehicleTitle } from "@/lib/format";
import type { Vehicle } from "@/types/vehicle";

/**
 * Builds wa.me links. No API, no backend — just a prefilled message,
 * which is exactly what the dealership uses today.
 */
function whatsappUrl(message: string): string {
  return `https://wa.me/${site.whatsapp.number}?text=${encodeURIComponent(message)}`;
}

export function generalWhatsappUrl(): string {
  return whatsappUrl(
    `Hola MILLE, quisiera más información sobre los vehículos disponibles.`,
  );
}

export function vehicleWhatsappUrl(vehicle: Vehicle): string {
  return whatsappUrl(
    `Hola MILLE, me interesa el ${vehicleTitle(vehicle)} ${vehicle.year} (${formatCOP(vehicle.price)}). ¿Sigue disponible?`,
  );
}
