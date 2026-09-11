/**
 * A car and a bike are different kinds of thing, not two categories of the
 * same list. The type comes first; the category lives inside it.
 */
export const VEHICLE_TYPES = ["auto", "moto"] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const AUTO_CATEGORIES = [
  "SUV",
  "Sedán",
  "Híbrido",
  "Eléctrico",
  "Deportivo",
  "4x4",
] as const;

export type AutoCategory = (typeof AUTO_CATEGORIES)[number];

export const MOTO_CATEGORIES = [
  "ADV",
  "Sport",
  "Naked",
  "Touring",
  "Enduro",
  "Cruiser",
  "Scooter",
] as const;

export type MotoCategory = (typeof MOTO_CATEGORIES)[number];

export type VehicleCategory = AutoCategory | MotoCategory;

export const VEHICLE_STATUSES = [
  "available",
  "reserved",
  "sold",
  "draft",
] as const;

export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const FUEL_TYPES = [
  "Gasolina",
  "Híbrido",
  "Híbrido enchufable",
  "Eléctrico",
  "Diésel",
] as const;

export type FuelType = (typeof FUEL_TYPES)[number];

export const TRANSMISSIONS = ["Automática", "Manual", "Automática secuencial"] as const;

export type Transmission = (typeof TRANSMISSIONS)[number];

export const DRIVETRAINS = ["4x4 (AWD)", "Trasera (RWD)", "Delantera (FWD)"] as const;

export type Drivetrain = (typeof DRIVETRAINS)[number];

export interface VehicleImage {
  /** Path under /public, or any URL the image loader can resolve. */
  src: string;
  alt: string;
}

/**
 * Kept flat rather than a discriminated union: every surface reads
 * `category` as a label and the admin form writes it through one generic
 * setter, which a union would force to narrow at every call site for no
 * real safety gain. `categoriesFor()` in lib/categories.ts is the single
 * place that decides which categories belong to which type.
 */
export interface Vehicle {
  id: string;
  slug: string;
  make: string;
  model: string;
  version: string;
  year: number;
  /** Colombian pesos, whole units. */
  price: number;
  /** Kilometres. */
  mileage: number;
  vehicleType: VehicleType;
  category: VehicleCategory;
  fuelType: FuelType;
  transmission: Transmission;
  drivetrain: Drivetrain;
  engine: string;
  power: string;
  exteriorColor: string;
  interiorColor: string;
  city: string;
  status: VehicleStatus;
  featured: boolean;
  description: string;
  equipment: string[];
  images: VehicleImage[];
  /** ISO 8601. Drives "most recent" ordering. */
  createdAt: string;
}

/** Everything the create/edit form owns. Ids and slugs are assigned by the store. */
export type VehicleDraft = Omit<Vehicle, "id" | "slug" | "createdAt">;

export interface InventoryStats {
  total: number;
  available: number;
  reserved: number;
  sold: number;
  draft: number;
}
