import type { FocalPoint } from "@/lib/focal-point";

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
 * Qué secciones técnicas tienen sentido para cada propulsión. Son las cinco
 * preguntas que deciden qué campos se piden en el admin y qué bloques se
 * dibujan en la ficha pública; tenerlas aquí evita repetir la condición —y
 * equivocarse en una de ellas— en cada pantalla.
 *
 * Todas aceptan `null` y todas responden que NO. Sin combustible elegido no
 * se sabe si el vehículo tiene cilindrada o batería, y la respuesta honesta
 * a una pregunta sin datos es no enseñar nada: ni pedir la capacidad de una
 * batería que quizá no exista, ni dibujar un bloque de motor térmico en lo
 * que puede ser un eléctrico.
 */
/**
 * `null` responde que SÍ, al revés que las demás, y la asimetría es
 * deliberada.
 *
 * Esconder el motor térmico porque todavía no se eligió el combustible
 * dejaba el formulario sin cilindrada ni cilindros nada más abrirlo —y con
 * un texto que daba por hecho que era eléctrico—. Enseñar los campos vacíos
 * no afirma nada: siguen en blanco hasta que alguien escriba. Esconderlos sí
 * afirmaba algo, y era falso.
 *
 * Las otras cuatro responden que no ante `null` precisamente por lo
 * contrario: pedir la capacidad de la batería de algo que quizá no la tenga
 * es invitar a inventarla.
 *
 * No mira el tipo de vehículo. Una moto de gasolina tiene motor térmico
 * exactamente igual que un carro de gasolina.
 */
export function hasCombustionEngine(fuelType: string | null): boolean {
  return fuelType !== "Eléctrico";
}

export function hasElectricDrive(fuelType: string | null): boolean {
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
export function hasTractionBattery(fuelType: string | null): boolean {
  return (
    fuelType === "Híbrido" ||
    fuelType === "Híbrido enchufable" ||
    fuelType === "Eléctrico"
  );
}

export function hasPlugCharging(fuelType: string | null): boolean {
  return fuelType === "Híbrido enchufable" || fuelType === "Eléctrico";
}

export function isFullyElectric(fuelType: string | null): boolean {
  return fuelType === "Eléctrico";
}

/**
 * Transmisión, y aquí empieza a separarse el vocabulario por universo.
 *
 * Un carro y una moto no se describen igual. "Automática" dice poco de una
 * moto, y "Manual secuencial" no significa nada en un carro. Compartir una
 * sola lista obligaba a elegir la etiqueta menos mala en los dos lados.
 */
export const CAR_TRANSMISSIONS = [
  "Automática",
  "Manual",
  "Doble embrague",
  "CVT",
  "Automática secuencial",
  "Otra",
] as const;

/**
 * El quickshifter NO está aquí, y no por olvido: no es un tipo de caja. Una
 * Panigale con caja manual secuencial de seis marchas y quickshifter sigue
 * teniendo una caja manual secuencial; el quickshifter es equipamiento.
 */
export const MOTO_TRANSMISSIONS = [
  "Manual secuencial",
  "Automática DCT",
  "CVT / variador",
  "Semiautomática",
  "Transmisión directa",
  "Otra",
] as const;

/**
 * La unión, para validar y para ordenar facetas. Nadie la ofrece entera en
 * un desplegable: para eso está `transmissionsFor()`.
 */
export const TRANSMISSIONS = [
  ...CAR_TRANSMISSIONS,
  ...MOTO_TRANSMISSIONS,
] as const;

export type Transmission = (typeof TRANSMISSIONS)[number];

export function transmissionsFor(
  vehicleType: VehicleType,
): readonly string[] {
  return vehicleType === "moto" ? MOTO_TRANSMISSIONS : CAR_TRANSMISSIONS;
}

/**
 * Cuántas marchas. Opcional y para los dos universos: una caja de ocho
 * relaciones es tan descriptiva en un X5 como las seis de una Multistrada.
 * No hay valor por defecto — "6" es lo habitual en moto, pero habitual no es
 * sabido.
 */
export const MIN_GEAR_COUNT = 1;
export const MAX_GEAR_COUNT = 8;

/**
 * Transmisión final: cómo llega el par a la rueda. Es un dato que toda ficha
 * de moto publica y que en un carro no se menciona nunca, así que sustituye
 * al selector de tracción cuando el universo es moto.
 */
export const FINAL_DRIVES = [
  "Cadena",
  "Correa",
  "Cardán",
  "Directa",
  "Otra",
] as const;

export type FinalDrive = (typeof FINAL_DRIVES)[number];

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

export const CAR_ENGINE_LAYOUTS = [
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

/**
 * La arquitectura de una moto no se nombra como la de un carro. Un bóxer de
 * una GS tiene dos cilindros, no cuatro; una Panigale es un V4 y una
 * Multistrada V2 un L-Twin. Forzar ambas en la lista de carros obligaba a
 * elegir "Otra" para casi todo el parque.
 *
 * `cylinders` sigue siendo un número aparte: la arquitectura dice cómo están
 * dispuestos, no cuántos son.
 */
export const MOTO_ENGINE_LAYOUTS = [
  "Monocilíndrico",
  "Bicilíndrico paralelo",
  "V2 / V-Twin",
  "L-Twin",
  "Bóxer 2",
  "I3",
  "I4",
  "V4",
  "I6",
  "Bóxer 6",
  "Otra",
] as const;

/** La unión, solo para validar: nadie la ofrece entera. */
export const ENGINE_LAYOUTS = [
  ...CAR_ENGINE_LAYOUTS,
  ...MOTO_ENGINE_LAYOUTS,
] as const;

export type EngineLayout = (typeof ENGINE_LAYOUTS)[number];

export function engineLayoutsFor(
  vehicleType: VehicleType,
): readonly string[] {
  return vehicleType === "moto" ? MOTO_ENGINE_LAYOUTS : CAR_ENGINE_LAYOUTS;
}

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
export const CAR_TAGS = [
  "Deportivo",
  "Performance",
  "Lujo",
  "Off-road",
  "Gran turismo",
  "Familiar",
  "Edición especial",
] as const;

/**
 * Corta a propósito, y sin repetir la categoría. "Sport" ya es un tipo de
 * moto, así que no hace falta también como carácter; "Familiar" no
 * significa nada aquí.
 */
export const MOTO_TAGS = [
  "Performance",
  "Off-road",
  "Urbana",
  "Confort",
  "Lujo",
  "Retro / Heritage",
  "Edición especial",
] as const;

/** La unión, para validar y para ordenar facetas. */
export const VEHICLE_TAGS = [
  ...CAR_TAGS,
  ...MOTO_TAGS.filter(
    (tag): tag is Exclude<(typeof MOTO_TAGS)[number], (typeof CAR_TAGS)[number]> =>
      !(CAR_TAGS as readonly string[]).includes(tag),
  ),
] as const;

export type VehicleTag = (typeof VEHICLE_TAGS)[number];

export function tagsFor(vehicleType: VehicleType): readonly string[] {
  return vehicleType === "moto" ? MOTO_TAGS : CAR_TAGS;
}

// ---------------------------------------------------------------------------
// Qué campos aplican a qué universo
// ---------------------------------------------------------------------------

/**
 * Carro y moto no son el mismo formulario con dos etiquetas cambiadas.
 *
 * Estas cuatro funciones son la única autoridad sobre qué campo aplica a
 * qué universo, y las consultan el formulario, la validación, los requisitos
 * de publicación, la ficha pública y los filtros. Tenerlas aquí es lo que
 * impide que una moto quede bloqueada por "falta la tracción" mientras el
 * selector de tracción ni siquiera se le muestra.
 */

/** FWD/RWD/AWD/4WD: un concepto de carro. */
export function usesDrivetrain(vehicleType: VehicleType): boolean {
  return vehicleType === "auto";
}

/** Cadena, correa o cardán: lo que una ficha de moto sí publica. */
export function usesFinalDrive(vehicleType: VehicleType): boolean {
  return vehicleType === "moto";
}

/** Una moto no tiene habitáculo que tapizar. */
export function usesInteriorColor(vehicleType: VehicleType): boolean {
  return vehicleType === "auto";
}

/**
 * Cómo se titula la categoría. La tabla y el parámetro `?categoria=` no
 * cambian; lo que cambia es que a nadie le interesa leer "Carrocería: ADV".
 */
export function categoryLabel(vehicleType: VehicleType): string {
  return vehicleType === "moto" ? "Tipo de moto" : "Carrocería";
}

/**
 * Los campos que pertenecen a un universo y no al vehículo.
 *
 * `categoryId` es `string | null` porque al formulario le llega como cadena
 * vacía y al servicio como null: lo que importa es que no sobrevive al
 * salto en ninguno de los dos.
 */
export interface TypeScopedFields {
  transmission: string | null;
  engineLayout: string | null;
  drivetrain: string | null;
  finalDrive: string | null;
  interiorColor: string;
  tags: string[];
  categoryId: string | null;
}

/**
 * Qué sobrevive a un cambio de universo.
 *
 * Una moto no conserva la tracción integral de un carro, ni un carro el
 * cardán de una moto; un V8 no es arquitectura de moto y "Familiar" no es
 * carácter de ninguna. Lo que SÍ vale en los dos —"Otra", un I4, la
 * etiqueta "Lujo"— se conserva, porque obligar a reelegir lo que ya era
 * correcto es trabajo inventado.
 *
 * Esta función existe porque la regla estaba escrita dos veces —una en el
 * formulario y otra en el servicio— y se desincronizaron: el formulario
 * limpiaba la transmisión al cambiar de tipo y el servicio no, así que un
 * carro podía acabar guardado con una caja "Manual secuencial". Ahora las
 * dos caras llaman aquí.
 *
 * No toca nada que sea del vehículo y no de su universo: marca, modelo,
 * precio, kilometraje, descripción y fotografías se quedan como estaban.
 */
export function keepOnTypeChange(
  nextType: VehicleType,
  current: TypeScopedFields,
): TypeScopedFields {
  return {
    transmission:
      current.transmission &&
      transmissionsFor(nextType).includes(current.transmission)
        ? current.transmission
        : null,
    engineLayout:
      current.engineLayout &&
      engineLayoutsFor(nextType).includes(current.engineLayout)
        ? current.engineLayout
        : null,
    drivetrain: usesDrivetrain(nextType) ? current.drivetrain : null,
    finalDrive: usesFinalDrive(nextType) ? current.finalDrive : null,
    interiorColor: usesInteriorColor(nextType) ? current.interiorColor : "",
    tags: current.tags.filter((tag) => tagsFor(nextType).includes(tag)),
    // La categoría pertenece a un universo por definición: la relación en
    // la base lleva su propio `vehicleType`.
    categoryId: null,
  };
}

// ---------------------------------------------------------------------------
// Categorías (carrocería / tipo de moto)
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
  /**
   * Qué parte de la fotografía se ve dentro del marco horizontal del sitio.
   * El archivo no se toca: esto es solo dónde mirar. Ver `lib/vehicle-frame`.
   */
  focal: FocalPoint;
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
  /**
   * Cómo termina la placa, en texto.
   *
   * En carro es un dígito, que es lo que mira el pico y placa. En moto no:
   * los formatos colombianos han cambiado con los años y dar por hecho
   * "número + letra" dejaría fuera placas perfectamente válidas, así que se
   * acepta alfanumérico y se guarda tal cual, en mayúsculas.
   *
   * Es un dato que se muestra, no uno del que se deduzca nada: aquí no se
   * calcula ningún pico y placa.
   */
  plateEnding: string | null;
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
  /** `null` mientras nadie lo haya escrito. */
  year: number | null;
  /** Pesos colombianos, unidades enteras. `null` en un borrador sin precio. */
  price: number | null;
  /**
   * Kilómetros. `null` es "sin rellenar" y 0 es cero de verdad: un importado
   * nuevo tiene 0 km, así que el cero no puede hacer también de ausencia.
   */
  mileage: number | null;
  /**
   * El universo al que pertenece la ficha. No es un dato técnico: de él
   * dependen qué carrocerías se ofrecen y en qué listado aparece, así que
   * siempre tiene valor y elegirlo no afirma nada sobre la mecánica.
   */
  vehicleType: VehicleType;
  /**
   * La carrocería. `null` mientras no se haya elegido.
   *
   * Nada la sustituye por una categoría "Pendiente": una fila falsa en la
   * taxonomía aparecería en los filtros, en la navegación y en la portada.
   */
  category: VehicleCategory | null;
  /** `null` mientras nadie lo haya elegido. Nunca un valor por defecto. */
  fuelType: string | null;
  /** Vocabulario propio de cada universo: ver `transmissionsFor()`. */
  transmission: string | null;
  /** Número de marchas, opcional. Se lee junto a la transmisión. */
  gearCount: number | null;
  /** Solo carros. En una moto es siempre `null`. */
  drivetrain: string | null;
  /** Solo motos: cadena, correa, cardán… En un carro es siempre `null`. */
  finalDrive: string | null;
  /** Nombre del motor tal como se lee: "3.0 L I6 TwinPower Turbo". */
  engine: string;
  exteriorColor: string;
  interiorColor: string;
  city: string | null;
  availability: AvailabilityStatus;
  publication: PublicationStatus;
  featured: boolean;
  description: string;
  /**
   * El equipamiento, una línea por elemento y en orden. Una línea entre
   * corchetes —`[Frenos]`— abre una sección.
   */
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
