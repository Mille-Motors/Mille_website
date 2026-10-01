import type {
  AvailabilityStatus as DbAvailability,
  ImageSource as DbImageSource,
  PublicationStatus as DbPublication,
  VehicleType as DbVehicleType,
} from "@/generated/prisma/enums";
import type {
  CategoryModel,
  VehicleImageModel,
  VehicleModel,
} from "@/generated/prisma/models";
import type {
  AvailabilityStatus,
  PublicationStatus,
  SpecialEquipmentItem,
  VehicleCategory,
  VehicleImage as UiImage,
  Vehicle as UiVehicle,
  VehicleType,
} from "@/types/vehicle";

/**
 * La frontera entre la base y la interfaz.
 *
 * Es el único archivo que conoce las dos formas: fuera de aquí, el frontend
 * nunca ve un modelo de Prisma y el servidor nunca decide cómo se ve algo.
 * Por eso los enums viajan en minúsculas hacia la UI y en mayúsculas hacia
 * Postgres, y los BigInt salen convertidos a number.
 */

export const toDbVehicleType: Record<VehicleType, DbVehicleType> = {
  auto: "AUTO",
  moto: "MOTO",
};

export const fromDbVehicleType: Record<DbVehicleType, VehicleType> = {
  AUTO: "auto",
  MOTO: "moto",
};

export const toDbAvailability: Record<AvailabilityStatus, DbAvailability> = {
  available: "AVAILABLE",
  reserved: "RESERVED",
  sold: "SOLD",
};

export const fromDbAvailability: Record<DbAvailability, AvailabilityStatus> = {
  AVAILABLE: "available",
  RESERVED: "reserved",
  SOLD: "sold",
};

export const toDbPublication: Record<PublicationStatus, DbPublication> = {
  draft: "DRAFT",
  published: "PUBLISHED",
  archived: "ARCHIVED",
};

export const fromDbPublication: Record<DbPublication, PublicationStatus> = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
};

const fromDbImageSource: Record<DbImageSource, UiImage["source"]> = {
  LEGACY: "legacy",
  STORAGE: "storage",
};

/**
 * El precio de la base al dominio.
 *
 * Existe como función con nombre por un motivo concreto: `Number(null)` es
 * 0, así que convertir a lo bruto volvía un borrador sin precio en uno que
 * vale cero pesos, y ahí se perdía justamente la distinción por la que la
 * columna admite NULL. Es un fallo de una sola línea y sin síntoma visible
 * hasta que alguien mira la lista del admin.
 */
export function toPriceNumber(value: bigint | null): number | null {
  return value === null ? null : Number(value);
}

/**
 * Una columna `date` de Postgres se convierte en "YYYY-MM-DD" leyendo sus
 * partes en UTC, que es donde Prisma deja la medianoche de un `@db.Date`.
 * Leerlas en hora local restaría cinco horas en Bogotá y un SOAT que vence
 * el 18 de marzo se mostraría venciendo el 17.
 */
export function toDateString(value: Date | null): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

/** El camino de vuelta: "2027-03-18" es el día 18, no el 18 menos cinco horas. */
export function fromDateString(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * `specialEquipment` es JSON y Postgres no garantiza su forma. Se valida al
 * leer y no solo al escribir: una fila editada a mano o venida de una
 * versión anterior no puede reventar la ficha pública.
 */
function toSpecialEquipment(value: unknown): SpecialEquipmentItem[] {
  if (!Array.isArray(value)) return [];
  const items: SpecialEquipmentItem[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name) continue;
    const description =
      typeof record.description === "string" && record.description.trim()
        ? record.description.trim()
        : null;
    items.push({ name, description });
  }
  return items;
}

export function toCategoryDto(category: CategoryModel): VehicleCategory {
  return {
    id: category.id,
    name: category.name,
    pluralName: category.pluralName,
    slug: category.slug,
    vehicleType: fromDbVehicleType[category.vehicleType],
    active: category.active,
    position: category.position,
  };
}

function toImageDto(image: VehicleImageModel): UiImage {
  return {
    id: image.id,
    src: image.url,
    alt: image.alt,
    source: fromDbImageSource[image.source],
    storagePath: image.storagePath,
  };
}

/** Lo que hay que traer de la base para poder construir un Vehicle de la UI. */
export type VehicleRecord = VehicleModel & {
  /** `null` en un borrador al que todavía no se le ha elegido carrocería. */
  category: CategoryModel | null;
  images: VehicleImageModel[];
};

/**
 * Imagen de respaldo. Un vehículo publicado siempre debería tener fotos,
 * pero la galería y las cards leen `images[0]` sin preguntar, y quedarse sin
 * portada no puede reventar la página pública.
 */
const PLACEHOLDER_IMAGE: UiImage = {
  id: "placeholder",
  src: "/images/brand/night.jpg",
  alt: "Vehículo de MILLE sin fotografía asignada",
  source: "legacy",
  storagePath: null,
};

export function toVehicleDto(record: VehicleRecord): UiVehicle {
  const images = [...record.images]
    .sort((a, b) => a.position - b.position)
    .map(toImageDto);

  return {
    id: record.id,
    slug: record.slug,
    make: record.make,
    model: record.model,
    version: record.version,
    year: record.year,
    // Los precios en COP caben de sobra en un number seguro; BigInt solo
    // protege la columna de un desbordamiento de Int4.
    price: toPriceNumber(record.price),
    mileage: record.mileage,
    vehicleType: fromDbVehicleType[record.vehicleType],
    category: record.category ? toCategoryDto(record.category) : null,
    fuelType: record.fuelType,
    transmission: record.transmission,
    drivetrain: record.drivetrain,
    engine: record.engine,
    exteriorColor: record.exteriorColor,
    interiorColor: record.interiorColor,
    city: record.city,
    availability: fromDbAvailability[record.availabilityStatus],
    publication: fromDbPublication[record.publicationStatus],
    featured: record.featured,
    description: record.description,
    features: record.features,
    equipment: record.equipment,
    specialEquipment: toSpecialEquipment(record.specialEquipment),
    tags: record.tags,
    specs: {
      engineLayout: record.engineLayout,
      cylinders: record.cylinders,
      displacementCc: record.displacementCc,
      aspiration: record.aspiration,
      powerHp: record.powerHp,
      torqueNm: record.torqueNm,
      accel0100: record.accel0100,
      topSpeedKph: record.topSpeedKph,
      topSpeedLimited: record.topSpeedLimited,
      topSpeedLimitedKph: record.topSpeedLimitedKph,
      curbWeightKg: record.curbWeightKg,
    },
    electrification: {
      icePowerHp: record.icePowerHp,
      iceTorqueNm: record.iceTorqueNm,
      electricMotorCount: record.electricMotorCount,
      electricPowerHp: record.electricPowerHp,
      electricTorqueNm: record.electricTorqueNm,
      electricMotorLayout: record.electricMotorLayout,
      hybridSystem: record.hybridSystem,
      batteryGrossKwh: record.batteryGrossKwh,
      batteryNetKwh: record.batteryNetKwh,
      electricRangeKm: record.electricRangeKm,
      rangeStandard: record.rangeStandard,
      chargeAcKw: record.chargeAcKw,
      chargeDcKw: record.chargeDcKw,
      chargeConnector: record.chargeConnector,
      chargeTimeNote: record.chargeTimeNote,
    },
    documentation: {
      registrationCity: record.registrationCity,
      plateLastDigit: record.plateLastDigit,
      soatValid: record.soatValid,
      soatExpiresOn: toDateString(record.soatExpiresOn),
      techInspectionApplies: record.techInspectionApplies,
      techInspectionExpiresOn: toDateString(record.techInspectionExpiresOn),
      taxStatus: record.taxStatus,
      taxesPaidThroughYear: record.taxesPaidThroughYear,
      documentationCheckedOn: toDateString(record.documentationCheckedOn),
      documentationNotes: record.documentationNotes,
    },
    funFact: {
      enabled: record.funFactEnabled,
      title: record.funFactTitle,
      body: record.funFactBody,
    },
    reviewNote: record.reviewNote,
    images: images.length > 0 ? images : [PLACEHOLDER_IMAGE],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    publishedAt: record.publishedAt?.toISOString() ?? null,
  };
}

/** Lo que hay que incluir en cualquier consulta que vaya a pasar por el mapper. */
export const vehicleInclude = {
  category: true,
  images: { orderBy: { position: "asc" } },
} as const;
