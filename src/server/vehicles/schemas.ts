import { z } from "zod";
import { EQUIPMENT_KEYS } from "@/lib/equipment-catalog";
import {
  ASPIRATIONS,
  AVAILABILITY_STATUSES,
  CHARGE_CONNECTORS,
  DRIVETRAINS,
  ELECTRIC_MOTOR_LAYOUTS,
  ENGINE_LAYOUTS,
  FUEL_TYPES,
  PUBLICATION_STATUSES,
  RANGE_STANDARDS,
  TAX_STATUSES,
  TRANSMISSIONS,
  VEHICLE_TAGS,
  VEHICLE_TYPES,
} from "@/types/vehicle";

/**
 * Validación de vehículos. Se aplica siempre en el servidor: lo que valide
 * el formulario es comodidad para quien escribe, nunca una garantía.
 *
 * Los vocabularios cerrados se comprueban contra las mismas listas que
 * pintan los desplegables (src/types/vehicle.ts) y contra el mismo catálogo
 * que pinta el equipamiento (src/lib/equipment-catalog.ts). No hay ninguna
 * opción escrita dos veces.
 */

const MAX_YEAR = new Date().getFullYear() + 2;
/** Techo generoso pero finito: evita que un cero de más pase inadvertido. */
const MAX_PRICE = 100_000_000_000;

const trimmed = (max: number) => z.string().trim().max(max);
const required = (max: number, message: string) =>
  trimmed(max).min(1, { message });

/**
 * Un campo opcional que llega vacío es AUSENCIA de dato, no dato vacío.
 *
 * El formulario manda "" cuando no se rellena algo y `null` no siempre
 * sobrevive un viaje por JSON intacto; guardar "" en una columna que
 * significa "no lo sabemos" haría que la ficha pública dibujara una fila en
 * blanco, que es justo lo que este modelo intenta evitar.
 */
const optionalText = (max: number) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
      if (value === null || value === undefined) return null;
      const clean = value.trim();
      return clean === "" ? null : clean.slice(0, max);
    });

/** Lo mismo para los números: "" y null son "sin dato", nunca 0. */
const optionalNumber = (
  min: number,
  max: number,
  { integer = true }: { integer?: boolean } = {},
) =>
  z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((value, ctx) => {
      if (value === null || value === undefined || value === "") return null;
      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(parsed)) {
        ctx.addIssue({ code: "custom", message: "No es un número." });
        return null;
      }
      const normalized = integer ? Math.trunc(parsed) : parsed;
      if (normalized < min || normalized > max) {
        ctx.addIssue({ code: "custom", message: "Valor fuera de rango." });
        return null;
      }
      return normalized;
    });

/** Un enum opcional: vacío es "sin dato"; un valor inventado sigue siendo error. */
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.enum(values), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value === "" || value == null ? null : value));

const optionalBoolean = z
  .union([z.boolean(), z.null()])
  .optional()
  .transform((value) => (value === undefined ? null : value));

/**
 * Una fecha administrativa es un día del calendario, no un instante: se
 * exige "YYYY-MM-DD" y se comprueba que exista de verdad —el 31 de febrero
 * se rechaza en vez de convertirse en el 3 de marzo—.
 */
const optionalDate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value, ctx) => {
    if (value === null || value === undefined || value.trim() === "") return null;
    const clean = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      ctx.addIssue({ code: "custom", message: "Fecha no válida." });
      return null;
    }
    const [year, month, day] = clean.split("-").map(Number);
    const probe = new Date(Date.UTC(year, month - 1, day));
    if (
      probe.getUTCFullYear() !== year ||
      probe.getUTCMonth() !== month - 1 ||
      probe.getUTCDate() !== day
    ) {
      ctx.addIssue({ code: "custom", message: "Esa fecha no existe." });
      return null;
    }
    if (year < 1900 || year > 2200) {
      ctx.addIssue({ code: "custom", message: "Fecha fuera de rango." });
      return null;
    }
    return clean;
  });

export const specialEquipmentItemSchema = z.object({
  name: required(120, "Ponle nombre al extra."),
  description: optionalText(400),
});

/**
 * La forma base, sin comprobaciones cruzadas. Existe para que crear y editar
 * salgan de la MISMA definición de campos: `vehiclePatchSchema` se deriva de
 * aquí y no puede quedarse atrás cuando se añade un campo nuevo.
 */
const vehicleFieldsSchema = z.object({
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
  /** La carrocería. Se llama `categoryId` porque así se llama la relación. */
  categoryId: z.uuid({ message: "Elige una carrocería." }),
  // Se validan contra las mismas uniones que usa la interfaz, pero se guardan
  // como texto: ampliar la lista no debería exigir una migración.
  fuelType: z.enum(FUEL_TYPES),
  transmission: z.enum(TRANSMISSIONS),
  drivetrain: z.enum(DRIVETRAINS),
  engine: trimmed(120).default(""),
  exteriorColor: trimmed(60).default(""),
  interiorColor: trimmed(60).default(""),
  city: required(80, "Indica la ciudad."),
  availability: z.enum(AVAILABILITY_STATUSES).default("available"),
  featured: z.boolean().default(false),
  description: required(4000, "Escribe una descripción."),

  // --- Motor y prestaciones ------------------------------------------------
  engineLayout: optionalEnum(ENGINE_LAYOUTS),
  cylinders: optionalNumber(1, 16),
  displacementCc: optionalNumber(49, 12_000),
  aspiration: optionalEnum(ASPIRATIONS),
  powerHp: optionalNumber(0, 3_000),
  torqueNm: optionalNumber(0, 5_000),
  accel0100: optionalNumber(0.1, 60, { integer: false }),
  topSpeedKph: optionalNumber(1, 600),
  topSpeedLimited: z.boolean().default(false),
  topSpeedLimitedKph: optionalNumber(1, 600),
  curbWeightKg: optionalNumber(1, 10_000),

  // --- Sistema híbrido / eléctrico ----------------------------------------
  icePowerHp: optionalNumber(0, 3_000),
  iceTorqueNm: optionalNumber(0, 5_000),
  electricMotorCount: optionalNumber(1, 8),
  electricPowerHp: optionalNumber(0, 3_000),
  electricTorqueNm: optionalNumber(0, 10_000),
  electricMotorLayout: optionalEnum(ELECTRIC_MOTOR_LAYOUTS),
  hybridSystem: optionalText(160),
  batteryGrossKwh: optionalNumber(0, 500, { integer: false }),
  batteryNetKwh: optionalNumber(0, 500, { integer: false }),
  electricRangeKm: optionalNumber(0, 2_000),
  rangeStandard: optionalEnum(RANGE_STANDARDS),
  chargeAcKw: optionalNumber(0, 100, { integer: false }),
  chargeDcKw: optionalNumber(0, 1_000, { integer: false }),
  chargeConnector: optionalEnum(CHARGE_CONNECTORS),
  chargeTimeNote: optionalText(160),

  // --- Documentación y matrícula ------------------------------------------
  registrationCity: optionalText(80),
  plateLastDigit: optionalNumber(0, 9),
  soatValid: optionalBoolean,
  soatExpiresOn: optionalDate,
  techInspectionApplies: optionalBoolean,
  techInspectionExpiresOn: optionalDate,
  taxStatus: optionalEnum(TAX_STATUSES),
  taxesPaidThroughYear: optionalNumber(1900, MAX_YEAR),
  documentationCheckedOn: optionalDate,
  documentationNotes: optionalText(600),

  // --- Editorial -----------------------------------------------------------
  funFactEnabled: z.boolean().default(false),
  funFactTitle: optionalText(120),
  funFactBody: optionalText(900),

  // --- Equipamiento y carácter ---------------------------------------------
  /**
   * Solo claves del catálogo. Se descartan las desconocidas en vez de
   * rechazar el guardado entero: si una clave se retira del catálogo, editar
   * un vehículo antiguo no puede quedar bloqueado por algo que él no eligió.
   */
  features: z
    .array(z.string())
    .max(200)
    .default([])
    .transform((keys) => {
      const valid = new Set(EQUIPMENT_KEYS);
      return [...new Set(keys.filter((key) => valid.has(key)))];
    }),
  equipment: z
    .array(trimmed(200))
    .max(60)
    .default([])
    // El orden importa y las líneas vacías no son equipamiento.
    .transform((items) => items.filter((item) => item.length > 0)),
  specialEquipment: z.array(specialEquipmentItemSchema).max(30).default([]),
  tags: z
    .array(z.enum(VEHICLE_TAGS))
    .max(VEHICLE_TAGS.length)
    .default([])
    .transform((items) => [...new Set(items)]),

  /** Solo se puede limpiar, nunca escribir: el aviso lo pone la migración. */
  reviewNote: z.null().optional(),

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

export const vehicleInputSchema = vehicleFieldsSchema
  .refine(
    (input) =>
      input.topSpeedLimitedKph === null ||
      input.topSpeedKph === null ||
      input.topSpeedLimitedKph <= input.topSpeedKph,
    {
      path: ["topSpeedLimitedKph"],
      message: "El límite no puede superar la velocidad máxima declarada.",
    },
  )
  .refine(
    (input) =>
      input.batteryNetKwh === null ||
      input.batteryGrossKwh === null ||
      input.batteryNetKwh <= input.batteryGrossKwh,
    {
      path: ["batteryNetKwh"],
      message: "La capacidad útil no puede superar la bruta.",
    },
  )
  .refine(
    // Activar el apunte sin escribirlo dejaría un bloque vacío en la ficha.
    (input) => !input.funFactEnabled || Boolean(input.funFactBody),
    {
      path: ["funFactBody"],
      message: "Escribe el apunte o desactívalo.",
    },
  );

export type VehicleInput = z.infer<typeof vehicleInputSchema>;

/**
 * Editar es lo mismo, pero sin obligar a reenviar todos los campos.
 *
 * Y sin aplicar valores por defecto, que es la parte que importa. `.partial()`
 * a secas los conserva: `parse({ price: 1 })` devolvía además `equipment: []`,
 * `tags: []`, `features: []` y `featured: false`, y el servicio los escribía
 * porque estaban definidos. Un PATCH que solo quería corregir el precio
 * borraba el equipamiento entero. Hoy funciona de milagro —el formulario
 * manda siempre la ficha completa— pero es una trampa puesta para el
 * siguiente que llame a este endpoint con dos campos.
 *
 * Aquí cada campo pierde su defecto antes de volverse opcional, así que lo
 * que no viene en la petición no existe en el resultado y el servicio lo
 * deja como estaba.
 */
type DropDefault<T extends z.ZodType> =
  T extends z.ZodDefault<infer Inner> ? Inner : T;

type VehicleShape = (typeof vehicleFieldsSchema)["shape"];

type PatchShape = {
  [K in keyof VehicleShape]: z.ZodOptional<DropDefault<VehicleShape[K]>>;
};

/**
 * Quita el valor por defecto de un campo, esté donde esté.
 *
 * No basta con mirar si el esquema es un `ZodDefault`: en cuanto un campo
 * lleva `.transform()` —`equipment`, `features`, `tags`— lo que queda es un
 * `ZodPipe` con el defecto escondido en su entrada. Esos tres eran
 * justamente los peligrosos, porque su defecto es la lista vacía.
 */
// Las partes internas de un esquema se declaran como `$ZodType`, la interfaz
// mínima; `ZodType` es la que tiene `.optional()` y `.pipe()`. En tiempo de
// ejecución son el mismo objeto.
const asZodType = (value: unknown): z.ZodType => value as z.ZodType;

function withoutDefault(schema: z.ZodType): z.ZodType {
  if (schema instanceof z.ZodDefault) return asZodType(schema.def.innerType);
  if (schema instanceof z.ZodPipe) {
    const input = asZodType(schema.def.in);
    const stripped = withoutDefault(input);
    if (stripped === input) return schema;
    return stripped.pipe(asZodType(schema.def.out));
  }
  return schema;
}

const patchShape = Object.fromEntries(
  Object.entries(vehicleFieldsSchema.shape).map(([key, schema]) => [
    key,
    withoutDefault(schema).optional(),
  ]),
  // Un solo cast, y acotado: el mapeo de tipos de arriba describe
  // exactamente lo que el bucle hace, pero `Object.fromEntries` no sabe
  // conservar las claves.
) as unknown as PatchShape;

/**
 * Las comprobaciones cruzadas se repiten sobre lo que llegue: en un parche
 * solo se aplican si ambos extremos vienen en la misma petición, que es lo
 * que hace el formulario.
 */
export const vehiclePatchSchema = z
  .object(patchShape)
  .refine(
    (input) =>
      input.topSpeedLimitedKph == null ||
      input.topSpeedKph == null ||
      input.topSpeedLimitedKph <= input.topSpeedKph,
    {
      path: ["topSpeedLimitedKph"],
      message: "El límite no puede superar la velocidad máxima declarada.",
    },
  )
  .refine(
    (input) =>
      input.batteryNetKwh == null ||
      input.batteryGrossKwh == null ||
      input.batteryNetKwh <= input.batteryGrossKwh,
    {
      path: ["batteryNetKwh"],
      message: "La capacidad útil no puede superar la bruta.",
    },
  )
  .refine(
    (input) => input.funFactEnabled !== true || Boolean(input.funFactBody),
    { path: ["funFactBody"], message: "Escribe el apunte o desactívalo." },
  );

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
const optionalQueryText = (max: number) =>
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
  q: optionalQueryText(120),
  vehicleType: z.enum(VEHICLE_TYPES).optional(),
  publication: z.enum(PUBLICATION_STATUSES).optional(),
  availability: z.enum(AVAILABILITY_STATUSES).optional(),
  make: optionalQueryText(60),
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
