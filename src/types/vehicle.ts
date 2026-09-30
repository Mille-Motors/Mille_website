/**
 * El modelo de dominio que consume la interfaz.
 *
 * No son los tipos de Prisma: la base guarda BigInt, enums en mayúsculas y
 * relaciones, y esta forma es la que las páginas y los componentes ya
 * esperaban. La traducción entre ambos vive en src/server/vehicles/mapper.ts,
 * que es el único archivo que conoce las dos formas.
 *
 * Este archivo es además la FUENTE ÚNICA de los vocabularios cerrados del
 * inventario —combustible, transmisión, tracción, arquitectura de motor,
 * etiquetas…—. El formulario de administración, los filtros públicos y la
 * validación de Zod leen exactamente estas listas: no hay ninguna opción
 * escrita a mano en un `<option>` ni en un `z.enum` de otro archivo.
 */

/**
 * Un carro y una moto son cosas distintas, no dos categorías de la misma
 * lista. El tipo va primero; la carrocería vive dentro de él.
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

// ---------------------------------------------------------------------------
// Propulsión
// ---------------------------------------------------------------------------

/**
 * Cómo se mueve el vehículo. Es propulsión, no carrocería: "Híbrido" y
 * "Eléctrico" viven aquí y solo aquí. Que antes existieran además como
 * categorías era el error que esta taxonomía corrige.
 *
 * Los cinco valores originales se conservan literalmente para no tocar los
 * registros que ya existen; "Híbrido ligero (MHEV)" es el único añadido.
 */
export const FUEL_TYPES = [
  "Gasolina",
  "Diésel",
  "Híbrido ligero (MHEV)",
  "Híbrido",
  "Híbrido enchufable",
  "Eléctrico",
] as const;

export type FuelType = (typeof FUEL_TYPES)[number];

/**
 * Qué secciones técnicas tienen sentido para cada propulsión. Son las cuatro
 * preguntas que deciden qué campos se piden en el admin y qué bloques se
 * dibujan en la ficha pública; tenerlas aquí evita repetir la condición —y
 * equivocarse en una de ellas— en cada pantalla.
 */
export function hasCombustionEngine(fuelType: string): boolean {
  return fuelType !== "Eléctrico";
}

export function hasElectricDrive(fuelType: string): boolean {
  return (
    fuelType === "Híbrido ligero (MHEV)" ||
    fuelType === "Híbrido" ||
    fuelType === "Híbrido enchufable" ||
    fuelType === "Eléctrico"
  );
}

/**
 * Un MHEV lleva una batería de 48 V que ningún fabricante publica como
 * capacidad ni como autonomía: pedirla sería invitar a inventarla.
 */
export function hasTractionBattery(fuelType: string): boolean {
  return (
    fuelType === "Híbrido" ||
    fuelType === "Híbrido enchufable" ||
    fuelType === "Eléctrico"
  );
}

export function hasPlugCharging(fuelType: string): boolean {
  return fuelType === "Híbrido enchufable" || fuelType === "Eléctrico";
}

export function isFullyElectric(fuelType: string): boolean {
  return fuelType === "Eléctrico";
}

export const TRANSMISSIONS = [
  "Automática",
  "Manual",
  "Doble embrague",
  "CVT",
  "Automática secuencial",
  "Otra",
] as const;

export type Transmission = (typeof TRANSMISSIONS)[number];

/**
 * AWD y 4WD no son lo mismo y el inventario ya no los mezcla: un Land
 * Cruiser con reductora y un X5 con reparto variable se describían antes con
 * la misma etiqueta, "4x4 (AWD)", que además convertía la tracción en algo
 * que parecía una carrocería.
 */
export const DRIVETRAINS = [
  "Delantera (FWD)",
  "Trasera (RWD)",
  "Integral (AWD)",
  "4x4 (4WD)",
] as const;

export type Drivetrain = (typeof DRIVETRAINS)[number];

// ---------------------------------------------------------------------------
// Especificaciones técnicas
// ---------------------------------------------------------------------------

export const ENGINE_LAYOUTS = [
  "I3",
  "I4",
  "I5",
  "I6",
  "V6",
  "V8",
  "V10",
  "V12",
  "Bóxer 4",
  "Bóxer 6",
  "Rotativo",
  "Otra",
] as const;

export type EngineLayout = (typeof ENGINE_LAYOUTS)[number];

export const ASPIRATIONS = [
  "Atmosférico",
  "Turbo",
  "Biturbo",
  "Compresor",
  "Turbo + compresor",
  "No aplica",
] as const;

export type Aspiration = (typeof ASPIRATIONS)[number];

export const ELECTRIC_MOTOR_LAYOUTS = [
  "Delantero",
  "Trasero",
  "Delantero y trasero",
  "Integrado en la transmisión",
  "Otra",
] as const;

export type ElectricMotorLayout = (typeof ELECTRIC_MOTOR_LAYOUTS)[number];

/**
 * Un dato de autonomía sin su ciclo de homologación no se puede comparar con
 * ningún otro: 500 km WLTP y 500 km CLTC no son la misma cifra.
 */
export const RANGE_STANDARDS = ["WLTP", "EPA", "CLTC", "NEDC", "Otro"] as const;

export type RangeStandard = (typeof RANGE_STANDARDS)[number];

export const CHARGE_CONNECTORS = [
  "Tipo 1 (J1772)",
  "Tipo 2 (Mennekes)",
  "CCS Combo 1",
  "CCS Combo 2",
  "CHAdeMO",
  "NACS (Tesla)",
  "Otro",
] as const;

export type ChargeConnector = (typeof CHARGE_CONNECTORS)[number];

// ---------------------------------------------------------------------------
// Documentación
// ---------------------------------------------------------------------------

export const TAX_STATUSES = ["Al día", "Pendiente", "Por verificar"] as const;

export type TaxStatus = (typeof TAX_STATUSES)[number];

// ---------------------------------------------------------------------------
// Carácter del vehículo
// ---------------------------------------------------------------------------

/**
 * Lo que un vehículo ES sin que eso sea su carrocería. Un M3 es un sedán
 * deportivo; un Golf GTI, un hatchback deportivo; un X5 M, una SUV
 * deportiva. "Deportivo" describe los tres y no es la carrocería de ninguno,
 * así que vive aquí, como etiqueta opcional y múltiple.
 */
export const VEHICLE_TAGS = [
  "Deportivo",
  "Performance",
  "Lujo",
  "Off-road",
  "Gran turismo",
  "Familiar",
  "Edición especial",
] as const;

export type VehicleTag = (typeof VEHICLE_TAGS)[number];

// ---------------------------------------------------------------------------
// Categorías (carrocería)
// ---------------------------------------------------------------------------

/**
 * Una categoría tal como la usa la interfaz. Conceptualmente es la
 * CARROCERÍA del vehículo —SUV, Sedán, Pickup, Coupé…— y así se titula en
 * todas las pantallas; el nombre interno `category` se conserva porque es el
 * de la tabla, el de la relación y el del parámetro que ya viaja en las URLs
 * compartidas.
 *
 * `name` es singular porque describe un vehículo ("Sedán"); `pluralName` es
 * como se lee en la navegación ("Sedanes"); `slug` es lo que viaja en la URL.
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

/**
 * Una opción destacada de ESTA unidad: Bowers & Wilkins, frenos
 * carbono-cerámicos, un paquete Individual. Se guarda como JSON porque es
 * una lista corta y ordenada de texto libre —el catálogo no puede prever un
 * paquete opcional raro— y porque nada la consulta ni la filtra.
 */
export interface SpecialEquipmentItem {
  name: string;
  description: string | null;
}

/**
 * Todo lo técnico avanzado es `null` cuando no se conoce, nunca 0 ni "".
 * Esa distinción es el motivo de que la ficha pueda ser muy completa sin
 * llegar nunca a inventar un dato: lo que no está, no se dibuja.
 */
export interface VehicleSpecs {
  /** Arquitectura: I6, V8, Bóxer 6… */
  engineLayout: string | null;
  cylinders: number | null;
  displacementCc: number | null;
  aspiration: string | null;
  /** Potencia del sistema: combinada en un híbrido, total en un eléctrico. */
  powerHp: number | null;
  torqueNm: number | null;
  /** Segundos. */
  accel0100: number | null;
  topSpeedKph: number | null;
  topSpeedLimited: boolean;
  /** El tope real cuando el limitador no coincide con la punta declarada. */
  topSpeedLimitedKph: number | null;
  /** Peso en orden de marcha, kg. */
  curbWeightKg: number | null;
}

/** Solo tiene sentido para lo que lleva un motor eléctrico a bordo. */
export interface VehicleElectrification {
  /** Reparto del sistema híbrido: lo que entrega el motor de combustión. */
  icePowerHp: number | null;
  iceTorqueNm: number | null;
  electricMotorCount: number | null;
  electricPowerHp: number | null;
  electricTorqueNm: number | null;
  electricMotorLayout: string | null;
  /** Descripción del sistema, cuando el fabricante le pone nombre. */
  hybridSystem: string | null;
  batteryGrossKwh: number | null;
  batteryNetKwh: number | null;
  electricRangeKm: number | null;
  rangeStandard: string | null;
  chargeAcKw: number | null;
  chargeDcKw: number | null;
  chargeConnector: string | null;
  chargeTimeNote: string | null;
}

/**
 * Lo que en Colombia decide si un carro se puede usar mañana. Las fechas
 * viajan como "YYYY-MM-DD" —día exacto, sin hora ni zona— porque un
 * vencimiento de SOAT es un día del calendario y convertirlo a un instante
 * UTC lo corría un día al mostrarlo en Bogotá.
 */
export interface VehicleDocumentation {
  registrationCity: string | null;
  /** 0–9. Es lo que decide el pico y placa. */
  plateLastDigit: number | null;
  soatValid: boolean | null;
  soatExpiresOn: string | null;
  /** `false` es una respuesta: hay vehículos a los que todavía no les aplica. */
  techInspectionApplies: boolean | null;
  techInspectionExpiresOn: string | null;
  taxStatus: string | null;
  taxesPaidThroughYear: number | null;
  documentationCheckedOn: string | null;
  documentationNotes: string | null;
}

/**
 * Un apunte editorial opcional. Apagado no reserva espacio ni pide texto:
 * la mayoría de los vehículos no tienen nada que contar aquí, y rellenarlo
 * por rellenar convertiría la sección en ruido.
 */
export interface VehicleFunFact {
  enabled: boolean;
  title: string | null;
  body: string | null;
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
  /** La carrocería. Ver `VehicleCategory`. */
  category: VehicleCategory;
  fuelType: string;
  transmission: string;
  drivetrain: string;
  /** Nombre del motor tal como se lee: "3.0 L I6 TwinPower Turbo". */
  engine: string;
  exteriorColor: string;
  interiorColor: string;
  city: string;
  availability: AvailabilityStatus;
  publication: PublicationStatus;
  featured: boolean;
  description: string;
  /** Claves del catálogo de src/lib/equipment-catalog.ts. */
  features: string[];
  /** Equipamiento adicional en texto libre. Lista ordenada. */
  equipment: string[];
  specialEquipment: SpecialEquipmentItem[];
  tags: string[];
  specs: VehicleSpecs;
  electrification: VehicleElectrification;
  documentation: VehicleDocumentation;
  funFact: VehicleFunFact;
  /**
   * Lo que una migración no pudo decidir sola. Se muestra en el admin como
   * aviso y nunca en el sitio público.
   */
  reviewNote: string | null;
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
  /** Null cuando no hay vehículo asociado o cuando ya no se puede leer. */
  vehicleType: VehicleType | null;
  createdAt: string;
  updatedAt: string;
}
