export const VEHICLE_CATEGORIES = [
  "SUV",
  "Sedán",
  "Híbrido",
  "Eléctrico",
  "Deportivo",
  "Moto",
] as const;

export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number];

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
