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
  category: CategoryModel;
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
    price: Number(record.price),
    mileage: record.mileage,
    vehicleType: fromDbVehicleType[record.vehicleType],
    category: toCategoryDto(record.category),
    fuelType: record.fuelType,
    transmission: record.transmission,
    drivetrain: record.drivetrain,
    engine: record.engine,
    power: record.power,
    exteriorColor: record.exteriorColor,
    interiorColor: record.interiorColor,
    city: record.city,
    availability: fromDbAvailability[record.availabilityStatus],
    publication: fromDbPublication[record.publicationStatus],
    featured: record.featured,
    description: record.description,
    equipment: record.equipment,
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
