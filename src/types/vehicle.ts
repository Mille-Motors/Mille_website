/**
 * El modelo de dominio que consume la interfaz.
 *
 * No son los tipos de Prisma: la base guarda BigInt, enums en mayúsculas y
 * relaciones, y esta forma es la que las páginas y los componentes ya
 * esperaban. La traducción entre ambos vive en src/server/vehicles/mapper.ts,
 * que es el único archivo que conoce las dos formas.
 */

/**
 * Un carro y una moto son cosas distintas, no dos categorías de la misma
 * lista. El tipo va primero; la categoría vive dentro de él.
 */
export const VEHICLE_TYPES = ["auto", "moto"] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

/**
 * Si el vehículo se puede comprar. Es lo que ve el público.
 */
export const AVAILABILITY_STATUSES = ["available", "reserved", "sold"] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

/**
 * Si el vehículo es visible en el sitio público. Independiente de la
 * disponibilidad: un vehículo vendido puede seguir publicado, y uno
 * disponible puede estar todavía en borrador.
 */
export const PUBLICATION_STATUSES = ["draft", "published", "archived"] as const;

export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const FUEL_TYPES = [
  "Gasolina",
  "Híbrido",
  "Híbrido enchufable",
  "Eléctrico",
  "Diésel",
] as const;

export type FuelType = (typeof FUEL_TYPES)[number];

export const TRANSMISSIONS = [
  "Automática",
  "Manual",
  "Automática secuencial",
] as const;

export type Transmission = (typeof TRANSMISSIONS)[number];

export const DRIVETRAINS = [
  "4x4 (AWD)",
  "Trasera (RWD)",
  "Delantera (FWD)",
] as const;

export type Drivetrain = (typeof DRIVETRAINS)[number];

/**
 * Una categoría tal como la usa la interfaz. `name` es singular porque
 * describe un vehículo ("Sedán"); `pluralName` es como se lee en la
 * navegación ("Sedanes"); `slug` es lo que viaja en la URL.
 *
 * Antes vivían en tres mapas fijos en el código. Ahora vienen de la base,
 * que es lo que permite administrarlas desde /admin/categorias.
 */
export interface VehicleCategory {
  id: string;
  name: string;
  pluralName: string;
  slug: string;
  vehicleType: VehicleType;
  active: boolean;
  position: number;
}

export interface VehicleImage {
  id: string;
  /** Ruta bajo /public, o URL pública de Supabase Storage. */
  src: string;
  alt: string;
  /** LEGACY vive en /public y el admin no puede borrarla del disco. */
  source: "legacy" | "storage";
  storagePath: string | null;
}

export interface Vehicle {
  id: string;
  slug: string;
  make: string;
  model: string;
  version: string;
  year: number;
  /** Pesos colombianos, unidades enteras. */
  price: number;
  /** Kilómetros. */
  mileage: number;
  vehicleType: VehicleType;
  category: VehicleCategory;
  fuelType: string;
  transmission: string;
  drivetrain: string;
  engine: string;
  power: string;
  exteriorColor: string;
  interiorColor: string;
  city: string;
  availability: AvailabilityStatus;
  publication: PublicationStatus;
  featured: boolean;
  description: string;
  equipment: string[];
  images: VehicleImage[];
  /** ISO 8601. Ordena "más recientes". */
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/** Lo que el inventario público necesita mostrar en el dashboard interno. */
export interface InventoryStats {
  total: number;
  published: number;
  draft: number;
  archived: number;
  available: number;
  reserved: number;
  sold: number;
  newInquiries: number;
}

export const INQUIRY_TYPES = [
  "general",
  "vehicle_info",
  "appointment",
] as const;

export type InquiryType = (typeof INQUIRY_TYPES)[number];

export const INQUIRY_STATUSES = ["new", "contacted", "closed", "spam"] as const;

export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export interface Inquiry {
  id: string;
  type: InquiryType;
  status: InquiryStatus;
  name: string;
  phone: string;
  email: string;
  message: string | null;
  source: string | null;
  vehicleId: string | null;
  vehicleLabel: string | null;
  vehicleSlug: string | null;
  createdAt: string;
  updatedAt: string;
}
