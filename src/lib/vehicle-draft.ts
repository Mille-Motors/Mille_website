import type { PublicationCandidate } from "@/lib/publication";
import { DEFAULT_VEHICLE_TYPE } from "@/lib/vehicle-defaults";
import type {
  AvailabilityStatus,
  SpecialEquipmentItem,
  VehicleType,
} from "@/types/vehicle";

/**
 * El borrador que el formulario de vehículos edita, y las dos funciones
 * puras que lo acompañan.
 *
 * Vive fuera del componente para poder probarlo sin montar React: la
 * pregunta "¿ha tocado algo el administrador?" decide si guardar crea una
 * fila, y esa decisión merece pruebas.
 */

/**
 * Exactamente lo que el formulario posee. El slug y las fechas de sistema
 * son del servidor.
 *
 * Todo lo opcional es `null` y nunca `""` ni `0`: la base distingue "no lo
 * sabemos" de "cero", y la ficha pública oculta lo primero en vez de
 * escribir "N/A". Si el borrador usara cadenas vacías, esa distinción se
 * perdería aquí, antes de llegar al servidor.
 */
export interface Draft {
  vehicleType: VehicleType;
  make: string;
  model: string;
  version: string;
  /** `null` mientras nadie lo escriba: el año no se presupone. */
  year: number | null;
  /** `null` es "sin rellenar". 0 es cero de verdad, y en kilometraje es válido. */
  price: number | null;
  mileage: number | null;
  /**
   * Los cinco atributos que antes nacían con el primer valor de su lista.
   *
   * La cadena vacía es el estado "Seleccionar…" del desplegable, y es lo que
   * se manda al servidor como ausencia. Preseleccionar "Gasolina" porque es
   * la primera opción hacía que un borrador de un 330e quedara guardado como
   * gasolina sin que nadie lo hubiera dicho.
   */
  categoryId: string;
  fuelType: string;
  transmission: string;
  gearCount: number | null;
  /** Solo carros. En moto se queda vacío y no se muestra. */
  drivetrain: string;
  /** Solo motos: cadena, correa, cardán. En carro se queda vacío. */
  finalDrive: string;
  engine: string;
  exteriorColor: string;
  interiorColor: string;
  city: string;
  availability: AvailabilityStatus;
  featured: boolean;
  description: string;

  engineLayout: string;
  cylinders: number | null;
  displacementCc: number | null;
  aspiration: string;
  powerHp: number | null;
  torqueNm: number | null;
  accel0100: string;
  topSpeedKph: number | null;
  topSpeedLimited: boolean;
  topSpeedLimitedKph: number | null;
  curbWeightKg: number | null;

  icePowerHp: number | null;
  iceTorqueNm: number | null;
  electricMotorCount: number | null;
  electricPowerHp: number | null;
  electricTorqueNm: number | null;
  electricMotorLayout: string;
  hybridSystem: string;
  batteryGrossKwh: string;
  batteryNetKwh: string;
  electricRangeKm: number | null;
  rangeStandard: string;
  chargeAcKw: string;
  chargeDcKw: string;
  chargeConnector: string;
  chargeTimeNote: string;

  registrationCity: string;
  /** Texto: un dígito en carro, alfanumérico en moto. */
  plateEnding: string;
  soatValid: boolean | null;
  soatExpiresOn: string;
  techInspectionApplies: boolean | null;
  techInspectionExpiresOn: string;
  taxStatus: string;
  taxesPaidThroughYear: number | null;
  documentationCheckedOn: string;
  documentationNotes: string;

  funFactEnabled: boolean;
  funFactTitle: string;
  funFactBody: string;

  specialEquipment: SpecialEquipmentItem[];
  tags: string[];
}

/** Los campos que el borrador guarda como texto y la base como número. */
export const DECIMAL_KEYS = [
  "accel0100",
  "batteryGrossKwh",
  "batteryNetKwh",
  "chargeAcKw",
  "chargeDcKw",
] as const satisfies readonly (keyof Draft)[];

export function emptyDraft(): Draft {
  return {
    // Un vehículo nuevo no afirma NADA. Lo único que trae es el universo
    // —carro o moto—, que no es un dato técnico sino de qué lista forma
    // parte y qué carrocerías se le pueden ofrecer.
    //
    // Todo lo demás arranca vacío, y el servidor crea el borrador con los
    // mismos huecos: lo que se guarda es exactamente lo que la pantalla
    // enseña, y la pantalla no enseña nada que nadie haya elegido.
    vehicleType: DEFAULT_VEHICLE_TYPE,
    make: "",
    model: "",
    version: "",
    year: null,
    price: null,
    mileage: null,
    categoryId: "",
    fuelType: "",
    transmission: "",
    gearCount: null,
    drivetrain: "",
    finalDrive: "",
    engine: "",
    exteriorColor: "",
    interiorColor: "",
    city: "",
    availability: "available",
    featured: false,
    description: "",

    engineLayout: "",
    cylinders: null,
    displacementCc: null,
    aspiration: "",
    powerHp: null,
    torqueNm: null,
    accel0100: "",
    topSpeedKph: null,
    topSpeedLimited: false,
    topSpeedLimitedKph: null,
    curbWeightKg: null,

    icePowerHp: null,
    iceTorqueNm: null,
    electricMotorCount: null,
    electricPowerHp: null,
    electricTorqueNm: null,
    electricMotorLayout: "",
    hybridSystem: "",
    batteryGrossKwh: "",
    batteryNetKwh: "",
    electricRangeKm: null,
    rangeStandard: "",
    chargeAcKw: "",
    chargeDcKw: "",
    chargeConnector: "",
    chargeTimeNote: "",

    registrationCity: "",
    plateEnding: "",
    soatValid: null,
    soatExpiresOn: "",
    techInspectionApplies: null,
    techInspectionExpiresOn: "",
    taxStatus: "",
    taxesPaidThroughYear: null,
    documentationCheckedOn: "",
    documentationNotes: "",

    funFactEnabled: false,
    funFactTitle: "",
    funFactBody: "",

    specialEquipment: [],
    tags: [],
  };
}

/**
 * ¿El administrador ha tocado algo, o es una pantalla que nadie ha usado?
 *
 * Decide si "Guardar borrador" crea una fila o se queda quieto. Sin esto,
 * abrir el alta y pulsar guardar dejaría un vehículo vacío por visita.
 *
 * Se compara contra un borrador recién nacido en vez de enumerar los campos
 * que cuentan. La lista enumerada ya falló una vez —se quedó fuera la
 * transmisión y la tracción, así que elegir solo la caja de cambios no
 * contaba como contenido— y volvería a fallar con el siguiente campo que se
 * añada: son casi setenta y ninguna prueba avisa de los que faltan.
 *
 * Comparar tiene además la propiedad que se busca: lo que sigue igual que
 * al abrir la pantalla es un valor inicial, no una decisión de nadie, y por
 * eso no cuenta. El tipo de vehículo cuenta solo si se cambió a Motos.
 *
 * Los textos se comparan recortados: escribir tres espacios en la marca no
 * es contenido, y `toPayload()` los recortaría igual antes de guardar.
 */
export function draftHasContent(draft: Draft, equipmentText = ""): boolean {
  if (equipmentText.trim() !== "") return true;

  const pristine = emptyDraft();
  return (Object.keys(pristine) as (keyof Draft)[]).some((key) => {
    const current = draft[key];
    const initial = pristine[key];
    if (typeof current === "string" && typeof initial === "string") {
      return current.trim() !== initial.trim();
    }
    // Arreglos y escalares: la comparación estructural basta y no se queda
    // obsoleta cuando el borrador gana un campo nuevo.
    return JSON.stringify(current) !== JSON.stringify(initial);
  });
}


/**
 * El borrador, en la forma que `publicationBlockers()` sabe leer.
 *
 * Existe por un fallo concreto: el panel "Falta para publicar" se calculaba
 * sobre la copia que el servidor devolvió la última vez, así que mientras
 * alguien rellenaba la ficha el panel seguía enumerando como ausente todo lo
 * que acababa de escribir. No era un cálculo stale por accidente: era que se
 * estaba preguntando por el objeto equivocado.
 *
 * Lo que el administrador tiene delante es el borrador. Lo único que el
 * borrador no sabe son las fotografías, que viven en el servidor porque se
 * suben una a una — así que se pasan aparte.
 *
 * El servidor sigue teniendo la última palabra: esto decide qué se enseña,
 * no qué se permite.
 */
export function draftPublicationCandidate(
  draft: Draft,
  images: { id: string }[],
): PublicationCandidate {
  return {
    vehicleType: draft.vehicleType,
    make: draft.make,
    model: draft.model,
    // Al panel solo le importa si hay carrocería elegida, no cuál.
    category: draft.categoryId ? { id: draft.categoryId } : null,
    year: draft.year,
    price: draft.price,
    mileage: draft.mileage,
    fuelType: draft.fuelType || null,
    transmission: draft.transmission || null,
    drivetrain: draft.drivetrain || null,
    finalDrive: draft.finalDrive || null,
    city: draft.city.trim() || null,
    description: draft.description,
    images,
  };
}
