import { z } from "zod";
import {
  AVAILABILITY_STATUSES,
  DRIVETRAINS,
  FUEL_TYPES,
  PUBLICATION_STATUSES,
  TRANSMISSIONS,
  VEHICLE_TYPES,
} from "@/types/vehicle";

/**
 * Validación de vehículos. Se aplica siempre en el servidor: lo que valide
 * el formulario es comodidad para quien escribe, nunca una garantía.
 */

const MAX_YEAR = new Date().getFullYear() + 2;
/** Techo generoso pero finito: evita que un cero de más pase inadvertido. */
const MAX_PRICE = 100_000_000_000;

const trimmed = (max: number) => z.string().trim().max(max);
const required = (max: number, message: string) =>
  trimmed(max).min(1, { message });

export const vehicleInputSchema = z.object({
  vehicleType: z.enum(VEHICLE_TYPES),
  make: required(60, "Indica la marca."),
  model: required(60, "Indica el modelo."),
  version: trimmed(80).default(""),
  year: z
    .number()
    .int()
    .min(1900, { message: "Año no válido." })
    .max(MAX_YEAR, { message: "Año no válido." }),
  price: z
    .number()
    .int({ message: "El precio debe ser un número entero de pesos." })
    .min(0, { message: "El precio no puede ser negativo." })
    .max(MAX_PRICE, { message: "Precio fuera de rango." }),
  mileage: z
    .number()
    .int()
    .min(0, { message: "El kilometraje no puede ser negativo." })
    .max(2_000_000, { message: "Kilometraje fuera de rango." }),
  categoryId: z.uuid({ message: "Elige una categoría." }),
  // Se validan contra las mismas uniones que usa la interfaz, pero se guardan
  // como texto: ampliar la lista no debería exigir una migración.
  fuelType: z.enum(FUEL_TYPES),
  transmission: z.enum(TRANSMISSIONS),
  drivetrain: z.enum(DRIVETRAINS),
  engine: trimmed(120).default(""),
  power: trimmed(60).default(""),
  exteriorColor: trimmed(60).default(""),
  interiorColor: trimmed(60).default(""),
  city: required(80, "Indica la ciudad."),
  availability: z.enum(AVAILABILITY_STATUSES).default("available"),
  featured: z.boolean().default(false),
  description: required(4000, "Escribe una descripción."),
  equipment: z
    .array(trimmed(200))
    .max(60)
    .default([])
    // El orden importa y las líneas vacías no son equipamiento.
    .transform((items) => items.filter((item) => item.length > 0)),
  /** Opcional: si no llega, se deriva de marca + modelo + versión. */
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "El slug solo admite minúsculas, números y guiones.",
    })
    .max(120)
    .optional(),
});

export type VehicleInput = z.infer<typeof vehicleInputSchema>;

/** Editar es lo mismo, pero sin obligar a reenviar todos los campos. */
export const vehiclePatchSchema = vehicleInputSchema.partial();

export type VehiclePatch = z.infer<typeof vehiclePatchSchema>;

export const availabilitySchema = z.object({
  availability: z.enum(AVAILABILITY_STATUSES),
});

export const publicationSchema = z.object({
  publication: z.enum(PUBLICATION_STATUSES),
});

/** Reordenar/renombrar imágenes ya existentes. */
export const imageOrderSchema = z.object({
  images: z
    .array(
      z.object({
        id: z.uuid(),
        position: z.number().int().min(0).max(99),
        alt: trimmed(300).optional(),
      }),
    )
    .max(40),
});

/** Cómo se puede ordenar el listado interno. */
export const ADMIN_VEHICLE_SORTS = [
  "updated",
  "created-desc",
  "created-asc",
  "price-asc",
  "price-desc",
  "year-asc",
  "year-desc",
] as const;

export type AdminVehicleSort = (typeof ADMIN_VEHICLE_SORTS)[number];

/**
 * Un parámetro vacío en la URL ("?marca=") tiene que leerse como ausencia de
 * filtro y no como un filtro por cadena vacía, que no devolvería nada.
 */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === "" ? undefined : value));

const optionalId = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" ? undefined : value))
  .refine((value) => value === undefined || z.uuid().safeParse(value).success, {
    message: "Identificador no válido.",
  });

const optionalInt = (min: number, max: number) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === "") return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
    })
    .refine((value) => value === undefined || (value >= min && value <= max), {
      message: "Valor fuera de rango.",
    });

export const adminVehicleQuerySchema = z.object({
  q: optionalText(120),
  vehicleType: z.enum(VEHICLE_TYPES).optional(),
  publication: z.enum(PUBLICATION_STATUSES).optional(),
  availability: z.enum(AVAILABILITY_STATUSES).optional(),
  make: optionalText(60),
  categoryId: optionalId,
  minYear: optionalInt(1900, 2100),
  maxYear: optionalInt(1900, 2100),
  minPrice: optionalInt(0, 100_000_000_000),
  maxPrice: optionalInt(0, 100_000_000_000),
  sort: z.enum(ADMIN_VEHICLE_SORTS).default("updated"),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  page: z.coerce.number().int().min(1).default(1),
});

export type AdminVehicleQuery = z.infer<typeof adminVehicleQuerySchema>;
