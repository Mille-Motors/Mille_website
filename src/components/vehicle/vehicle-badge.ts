import type { Vehicle } from "@/types/vehicle";

export interface VehicleBadge {
  label: string;
  /** Cómo se pinta: lo que pasa con el vehículo pesa más que cómo se mueve. */
  tone: "sold" | "reserved" | "neutral";
}

/**
 * Una insignia solo cuando dice algo. La mayoría de los carros no lleva
 * ninguna: si todas las tarjetas tienen una, ninguna significa nada.
 */
export function badgeFor(vehicle: Vehicle): VehicleBadge | null {
  if (vehicle.availability === "sold") return { label: "Vendido", tone: "sold" };
  if (vehicle.availability === "reserved") {
    return { label: "Reservado", tone: "reserved" };
  }
  if (vehicle.fuelType === "Eléctrico") return { label: "Eléctrico", tone: "neutral" };
  if (vehicle.fuelType === "Híbrido enchufable") {
    return { label: "Enchufable", tone: "neutral" };
  }
  if (vehicle.fuelType === "Híbrido") return { label: "Híbrido", tone: "neutral" };
  // Un MHEV no lleva distintivo: un 48 V que no mueve el carro por sí solo
  // no es lo que alguien entiende al leer "Híbrido" en una card.
  return null;
}

export const badgeClass: Record<VehicleBadge["tone"], string> = {
  sold: "bg-ink/90 text-cream",
  reserved: "bg-burgundy text-cream",
  neutral: "bg-cream/95 text-ink",
};
