import type {
  Vehicle,
  VehicleDocumentation,
  VehicleElectrification,
  VehicleSpecs,
} from "@/types/vehicle";

/**
 * Un vehículo de dominio para las pruebas.
 *
 * Existe porque el modelo pasó de veinte campos a casi noventa y tres
 * archivos de prueba lo escribían entero cada uno: añadir una columna
 * significaba tocar los tres, y bastaba olvidar uno para que las pruebas
 * dejaran de compilar por una razón que no tenía nada que ver con lo que
 * comprueban.
 *
 * Los valores por defecto son deliberadamente los de un vehículo del que
 * NO sabemos nada técnico: todo en null. Así, una prueba que quiera
 * comprobar que un dato se muestra tiene que ponerlo explícitamente, y
 * ninguna puede pasar por accidente gracias a un valor que el fixture
 * regaló.
 */
export const emptySpecs: VehicleSpecs = {
  engineLayout: null,
  cylinders: null,
  displacementCc: null,
  aspiration: null,
  powerHp: null,
  torqueNm: null,
  accel0100: null,
  topSpeedKph: null,
  topSpeedLimited: false,
  topSpeedLimitedKph: null,
  curbWeightKg: null,
};

export const emptyElectrification: VehicleElectrification = {
  icePowerHp: null,
  iceTorqueNm: null,
  electricMotorCount: null,
  electricPowerHp: null,
  electricTorqueNm: null,
  electricMotorLayout: null,
  hybridSystem: null,
  batteryGrossKwh: null,
  batteryNetKwh: null,
  electricRangeKm: null,
  rangeStandard: null,
  chargeAcKw: null,
  chargeDcKw: null,
  chargeConnector: null,
  chargeTimeNote: null,
};

export const emptyDocumentation: VehicleDocumentation = {
  registrationCity: null,
  plateLastDigit: null,
  soatValid: null,
  soatExpiresOn: null,
  techInspectionApplies: null,
  techInspectionExpiresOn: null,
  taxStatus: null,
  taxesPaidThroughYear: null,
  documentationCheckedOn: null,
  documentationNotes: null,
};

const base: Vehicle = {
  id: "1",
  slug: "bmw-x5",
  make: "BMW",
  model: "X5",
  version: "xDrive40i",
  year: 2023,
  price: 350_000_000,
  mileage: 20_000,
  vehicleType: "auto",
  category: {
    id: "c1",
    name: "SUV",
    pluralName: "SUV",
    slug: "suv",
    vehicleType: "auto",
    active: true,
    position: 0,
  },
  fuelType: "Gasolina",
  transmission: "Automática",
  drivetrain: "Integral (AWD)",
  engine: "3.0 L I6 TwinPower Turbo",
  exteriorColor: "Gris",
  interiorColor: "Negro",
  city: "Bogotá, CO",
  availability: "available",
  publication: "draft",
  featured: false,
  description: "Un vehículo.",
  features: [],
  equipment: [],
  specialEquipment: [],
  tags: [],
  specs: emptySpecs,
  electrification: emptyElectrification,
  documentation: emptyDocumentation,
  funFact: { enabled: false, title: null, body: null },
  reviewNote: null,
  images: [
    { id: "i1", src: "/a.jpg", alt: "a", source: "legacy", storagePath: null },
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  publishedAt: null,
};

/**
 * Lo que se puede sobrescribir. Los cuatro grupos anidados admiten trozos
 * sueltos —`specs: { powerHp: 340 }`— porque una prueba que quiere fijar un
 * dato no debería tener que repetir los otros diez en null.
 */
export type VehicleOverrides = Partial<Omit<Vehicle, "specs" | "electrification" | "documentation" | "funFact">> & {
  specs?: Partial<VehicleSpecs>;
  electrification?: Partial<VehicleElectrification>;
  documentation?: Partial<VehicleDocumentation>;
  funFact?: Partial<Vehicle["funFact"]>;
};

/** Un vehículo con lo que se le pase encima del básico. */
export function makeVehicle(overrides: VehicleOverrides = {}): Vehicle {
  return {
    ...base,
    ...overrides,
    specs: { ...emptySpecs, ...overrides.specs },
    electrification: { ...emptyElectrification, ...overrides.electrification },
    documentation: { ...emptyDocumentation, ...overrides.documentation },
    funFact: { ...base.funFact, ...overrides.funFact },
  };
}
