import {
  equipmentLinesFromText,
  equipmentTextFromLines,
} from "@/lib/equipment";
import type { PublicationCandidate } from "@/lib/publication";
import { DEFAULT_VEHICLE_TYPE } from "@/lib/vehicle-defaults";
import {
  hasCombustionEngine,
  hasElectricDrive,
  hasPlugCharging,
  hasTractionBattery,
  usesDrivetrain,
  usesFinalDrive,
  usesInteriorColor,
} from "@/types/vehicle";
import type {
  AvailabilityStatus,
  SpecialEquipmentItem,
  Vehicle,
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

/**
 * Con qué vehículo se queda el formulario cuando una subida falla.
 *
 * Parece trivial y era un fallo real: al fallar la subida se descartaba el
 * borrador que se había creado para alojarla, pero el formulario seguía
 * apuntando a él. Quedaba señalando una fila que acababa de dejar de
 * existir, y el siguiente intento subía contra un id borrado.
 *
 * Las tres situaciones, que es lo que esta función encierra:
 *
 *   - el borrador era nuestro y se descartó: no queda vehículo, `null`. El
 *     siguiente intento creará uno nuevo desde cero;
 *   - el borrador era nuestro pero NO se pudo descartar: sigue existiendo,
 *     así que el formulario lo conserva. Afirmar que se borró cuando no fue
 *     así deja la pantalla mintiendo;
 *   - el vehículo ya existía antes: la subida fallida no lo toca.
 */
export function vehicleAfterAbortedUpload<T>(input: {
  /** El borrador se creó en ESTA subida, solo para poder alojarla. */
  createdDraft: boolean;
  /** El descarte del borrador se confirmó. */
  draftDiscarded: boolean;
  vehicle: T;
}): T | null {
  if (input.createdDraft && input.draftDiscarded) return null;
  return input.vehicle;
}

// ---------------------------------------------------------------------------
// Vehículo ⇄ borrador ⇄ payload
// ---------------------------------------------------------------------------

/** `null` se convierte en el vacío que el control sabe mostrar. */
const str = (value: string | null): string => value ?? "";
const num = (value: number | null): string =>
  value === null ? "" : String(value);

/** Una cadena vacía es ausencia de dato; un decimal escrito con coma vale. */
export function decimalFromInput(value: string): number | null {
  const clean = value.replace(",", ".").trim();
  if (clean === "") return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Cargar un vehículo para editarlo.
 *
 * Es el reverso exacto de `vehiclePayload`: cada campo que se puede crear se
 * puede editar, y se carga con el valor que tiene. Las dos funciones viven
 * juntas a propósito — si una gana un campo y la otra no, el dato se escribe
 * y se pierde al volver a guardar.
 *
 * Vivían dentro del componente. Están aquí porque además de convertir son
 * ahora lo que decide si el formulario tiene cambios sin guardar, y esa
 * decisión merece probarse sin montar React.
 */
export function draftFromVehicle(vehicle: Vehicle): Draft {
  const { specs, electrification: e, documentation: d, funFact } = vehicle;
  return {
    vehicleType: vehicle.vehicleType,
    make: vehicle.make,
    model: vehicle.model,
    version: vehicle.version,
    year: vehicle.year,
    price: vehicle.price,
    mileage: vehicle.mileage,
    categoryId: vehicle.category?.id ?? "",
    fuelType: str(vehicle.fuelType),
    transmission: str(vehicle.transmission),
    gearCount: vehicle.gearCount,
    drivetrain: str(vehicle.drivetrain),
    finalDrive: str(vehicle.finalDrive),
    engine: vehicle.engine,
    exteriorColor: vehicle.exteriorColor,
    interiorColor: vehicle.interiorColor,
    city: str(vehicle.city),
    availability: vehicle.availability,
    featured: vehicle.featured,
    description: vehicle.description,

    engineLayout: str(specs.engineLayout),
    cylinders: specs.cylinders,
    displacementCc: specs.displacementCc,
    aspiration: str(specs.aspiration),
    powerHp: specs.powerHp,
    torqueNm: specs.torqueNm,
    accel0100: num(specs.accel0100),
    topSpeedKph: specs.topSpeedKph,
    topSpeedLimited: specs.topSpeedLimited,
    topSpeedLimitedKph: specs.topSpeedLimitedKph,
    curbWeightKg: specs.curbWeightKg,

    icePowerHp: e.icePowerHp,
    iceTorqueNm: e.iceTorqueNm,
    electricMotorCount: e.electricMotorCount,
    electricPowerHp: e.electricPowerHp,
    electricTorqueNm: e.electricTorqueNm,
    electricMotorLayout: str(e.electricMotorLayout),
    hybridSystem: str(e.hybridSystem),
    batteryGrossKwh: num(e.batteryGrossKwh),
    batteryNetKwh: num(e.batteryNetKwh),
    electricRangeKm: e.electricRangeKm,
    rangeStandard: str(e.rangeStandard),
    chargeAcKw: num(e.chargeAcKw),
    chargeDcKw: num(e.chargeDcKw),
    chargeConnector: str(e.chargeConnector),
    chargeTimeNote: str(e.chargeTimeNote),

    registrationCity: str(d.registrationCity),
    plateEnding: str(d.plateEnding),
    soatValid: d.soatValid,
    soatExpiresOn: str(d.soatExpiresOn),
    techInspectionApplies: d.techInspectionApplies,
    techInspectionExpiresOn: str(d.techInspectionExpiresOn),
    taxStatus: str(d.taxStatus),
    taxesPaidThroughYear: d.taxesPaidThroughYear,
    documentationCheckedOn: str(d.documentationCheckedOn),
    documentationNotes: str(d.documentationNotes),

    funFactEnabled: funFact.enabled,
    funFactTitle: str(funFact.title),
    funFactBody: str(funFact.body),

    specialEquipment: vehicle.specialEquipment,
    tags: vehicle.tags,
  };
}

/**
 * El borrador, en la forma que espera el servidor.
 *
 * Los campos que no aplican a esta propulsión se mandan en `null` en vez de
 * omitirse: cambiar un PHEV a gasolina tiene que BORRAR su batería, no
 * dejarla escondida en la base esperando a que alguien la vuelva a ver.
 */
export function vehiclePayload(
  draft: Draft,
  equipmentText: string,
  reviewNote: string | null,
) {
  const text = (value: string) => value.trim() || null;
  const showIce = hasCombustionEngine(text(draft.fuelType));
  const electric = hasElectricDrive(text(draft.fuelType));
  const showBattery = hasTractionBattery(text(draft.fuelType));
  const showCharging = hasPlugCharging(text(draft.fuelType));

  return {
    vehicleType: draft.vehicleType,
    make: draft.make,
    model: draft.model,
    version: draft.version,
    year: draft.year,
    // `null` viaja tal cual: es "todavía no se sabe", y convertirlo en 0
    // haría que un borrador sin precio pareciera valer cero pesos.
    price: draft.price,
    mileage: draft.mileage,
    // El "Seleccionar…" de cada desplegable es la cadena vacía, y se manda
    // como ausencia. Así el borrador guarda lo que la pantalla enseña: un
    // hueco, no la primera opción de la lista.
    categoryId: text(draft.categoryId),
    fuelType: text(draft.fuelType),
    transmission: text(draft.transmission),
    gearCount: draft.gearCount,
    // Cada universo manda el suyo y NULL el del otro: así cambiar de tipo
    // no deja escondido debajo un dato que ya no aplica.
    drivetrain: usesDrivetrain(draft.vehicleType) ? text(draft.drivetrain) : null,
    finalDrive: usesFinalDrive(draft.vehicleType) ? text(draft.finalDrive) : null,
    engine: draft.engine,
    exteriorColor: draft.exteriorColor,
    interiorColor: usesInteriorColor(draft.vehicleType) ? draft.interiorColor : "",
    city: text(draft.city),
    availability: draft.availability,
    featured: draft.featured,
    description: draft.description,

    engineLayout: showIce ? text(draft.engineLayout) : null,
    cylinders: showIce ? draft.cylinders : null,
    displacementCc: showIce ? draft.displacementCc : null,
    aspiration: showIce ? text(draft.aspiration) : null,
    powerHp: draft.powerHp,
    torqueNm: draft.torqueNm,
    accel0100: decimalFromInput(draft.accel0100),
    topSpeedKph: draft.topSpeedKph,
    topSpeedLimited: draft.topSpeedLimited,
    topSpeedLimitedKph: draft.topSpeedLimited ? draft.topSpeedLimitedKph : null,
    curbWeightKg: draft.curbWeightKg,

    icePowerHp: electric && showIce ? draft.icePowerHp : null,
    iceTorqueNm: electric && showIce ? draft.iceTorqueNm : null,
    electricMotorCount: electric ? draft.electricMotorCount : null,
    electricPowerHp: electric ? draft.electricPowerHp : null,
    electricTorqueNm: electric ? draft.electricTorqueNm : null,
    electricMotorLayout: electric ? text(draft.electricMotorLayout) : null,
    hybridSystem: electric ? text(draft.hybridSystem) : null,
    batteryGrossKwh: showBattery ? decimalFromInput(draft.batteryGrossKwh) : null,
    batteryNetKwh: showBattery ? decimalFromInput(draft.batteryNetKwh) : null,
    electricRangeKm: showBattery ? draft.electricRangeKm : null,
    rangeStandard: showBattery ? text(draft.rangeStandard) : null,
    chargeAcKw: showCharging ? decimalFromInput(draft.chargeAcKw) : null,
    chargeDcKw: showCharging ? decimalFromInput(draft.chargeDcKw) : null,
    chargeConnector: showCharging ? text(draft.chargeConnector) : null,
    chargeTimeNote: showCharging ? text(draft.chargeTimeNote) : null,

    registrationCity: text(draft.registrationCity),
    plateEnding: text(draft.plateEnding),
    soatValid: draft.soatValid,
    soatExpiresOn: text(draft.soatExpiresOn),
    techInspectionApplies: draft.techInspectionApplies,
    // Si la tecnomecánica no aplica, una fecha de vencimiento no significa
    // nada: se borra en vez de quedarse contradiciendo al campo de al lado.
    techInspectionExpiresOn:
      draft.techInspectionApplies === false
        ? null
        : text(draft.techInspectionExpiresOn),
    taxStatus: text(draft.taxStatus),
    taxesPaidThroughYear: draft.taxesPaidThroughYear,
    documentationCheckedOn: text(draft.documentationCheckedOn),
    documentationNotes: text(draft.documentationNotes),

    funFactEnabled: draft.funFactEnabled,
    funFactTitle: draft.funFactEnabled ? text(draft.funFactTitle) : null,
    funFactBody: draft.funFactEnabled ? text(draft.funFactBody) : null,

    // El texto se convierte en líneas aquí: se tiran las vacías y los
    // huecos de la plantilla que nadie rellenó ("ABS:" a secas).
    equipment: equipmentLinesFromText(equipmentText),
    specialEquipment: draft.specialEquipment
      .filter((item) => item.name.trim())
      .map((item) => ({
        name: item.name.trim(),
        description: item.description?.trim() || null,
      })),
    tags: draft.tags,
    ...(reviewNote === null ? { reviewNote: null } : {}),
  };
}

/**
 * ¿Hay cambios que se perderían al salir?
 *
 * Se compara el PAYLOAD, no el estado de los controles. Es la única forma
 * honesta: el borrador guarda texto a medio escribir —"3,5" antes de ser
 * 3.5, un espacio de más, una línea de plantilla sin rellenar— y nada de
 * eso llega a la base. Comparar `draft` en crudo marcaría como pendiente un
 * formulario que ya está guardado.
 *
 * Y se compara contra el payload DERIVADO de lo último persistido, pasando
 * por la misma transformación, de modo que las dos orillas se normalizan
 * igual.
 *
 * Lo que NO cuenta: ajustar el encuadre de una foto, reordenarlas o
 * borrarlas. Esas operaciones se guardan solas contra el servidor y
 * devuelven un vehículo nuevo; sus campos no están en este payload, así que
 * no pueden encender ni apagar el aviso.
 *
 * Sin fila todavía, "sucio" es "ha escrito algo", que es la misma pregunta
 * que decide si guardar debe crear el borrador.
 */
export function draftIsDirty(input: {
  persisted: Vehicle | null;
  draft: Draft;
  equipmentText: string;
  reviewNote: string | null;
}): boolean {
  const current = vehiclePayload(input.draft, input.equipmentText, input.reviewNote);

  if (!input.persisted) return draftHasContent(input.draft, input.equipmentText);

  const saved = vehiclePayload(
    draftFromVehicle(input.persisted),
    equipmentTextFromLines(input.persisted.equipment),
    input.persisted.reviewNote,
  );

  // Las claves se escriben en el mismo orden en los dos lados —salen del
  // mismo literal— y el orden de `tags`, `equipment` y `specialEquipment` es
  // significativo, así que comparar el texto serializado es exacto aquí.
  return JSON.stringify(current) !== JSON.stringify(saved);
}
