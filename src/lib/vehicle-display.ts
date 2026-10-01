import { formatDateOnly, formatDecimal, formatInteger } from "@/lib/format";
import {
  hasCombustionEngine,
  hasElectricDrive,
  hasPlugCharging,
  hasTractionBattery,
  isFullyElectric,
} from "@/types/vehicle";
import type { Vehicle } from "@/types/vehicle";

/**
 * Cómo se lee una ficha técnica.
 *
 * Todo lo que la página pública muestra de un vehículo se arma aquí, y la
 * regla es una sola: **una fila solo existe si su dato existe**. No hay
 * ningún camino por el que se pueda dibujar "Torque: N/A" o "Batería: —",
 * porque una fila sin valor no llega a construirse.
 *
 * El módulo es puro —no toca la base, no importa `server-only`— para que las
 * pruebas puedan comprobar exactamente eso sin levantar PostgreSQL.
 */

export interface SpecRow {
  label: string;
  value: string;
}

export interface SpecBlock {
  title: string;
  rows: SpecRow[];
}

/** Añade la fila solo si hay algo que poner en ella. */
function push(rows: SpecRow[], label: string, value: string | null | undefined) {
  if (value === null || value === undefined || value === "") return;
  rows.push({ label, value });
}

export function formatHp(value: number | null): string | null {
  return value === null ? null : `${formatInteger(value)} hp`;
}

export function formatNm(value: number | null): string | null {
  return value === null ? null : `${formatInteger(value)} Nm`;
}

export function formatSeconds(value: number | null): string | null {
  return value === null ? null : `${formatDecimal(value)} s`;
}

export function formatKph(value: number | null): string | null {
  return value === null ? null : `${formatInteger(value)} km/h`;
}

export function formatKg(value: number | null): string | null {
  return value === null ? null : `${formatInteger(value)} kg`;
}

export function formatKwh(value: number | null): string | null {
  return value === null ? null : `${formatDecimal(value)} kWh`;
}

export function formatKw(value: number | null): string | null {
  return value === null ? null : `${formatDecimal(value)} kW`;
}

export function formatKm(value: number | null): string | null {
  return value === null ? null : `${formatInteger(value)} km`;
}

/**
 * "1.998 cc" y no "2.0 L": la cifra exacta es la que el fabricante publica,
 * y redondearla a litros sería reescribir el dato.
 */
export function formatDisplacement(value: number | null): string | null {
  return value === null ? null : `${formatInteger(value)} cc`;
}

/**
 * La relación peso/potencia se calcula, nunca se pide: si tenemos los dos
 * números, escribirla a mano solo abre la puerta a que no cuadren.
 */
export function powerToWeight(vehicle: Vehicle): string | null {
  const { powerHp, curbWeightKg } = vehicle.specs;
  if (!powerHp || !curbWeightKg) return null;
  return `${formatDecimal(curbWeightKg / powerHp, 1)} kg/hp`;
}

/** Cómo se titula la potencia según lo que la produce. */
export function powerLabel(fuelType: string | null): string {
  if (isFullyElectric(fuelType)) return "Potencia total";
  if (hasElectricDrive(fuelType)) return "Potencia combinada";
  return "Potencia";
}

/**
 * La tira de arriba: lo que alguien quiere saber en tres segundos. Se
 * limita a lo que de verdad distingue a un carro de otro, y las que no
 * tienen dato simplemente no aparecen.
 */
export function quickFacts(vehicle: Vehicle): SpecRow[] {
  const rows: SpecRow[] = [];
  push(rows, powerLabel(vehicle.fuelType), formatHp(vehicle.specs.powerHp));
  push(rows, "Torque", formatNm(vehicle.specs.torqueNm));
  push(rows, "0–100 km/h", formatSeconds(vehicle.specs.accel0100));
  push(rows, "Combustible", vehicle.fuelType);
  push(rows, "Transmisión", vehicle.transmission);
  push(rows, "Tracción", vehicle.drivetrain);
  return rows;
}


/** Cilindrada, arquitectura y alimentación. Vacío en un eléctrico. */
export function engineRows(vehicle: Vehicle): SpecRow[] {
  if (!hasCombustionEngine(vehicle.fuelType)) return [];
  const rows: SpecRow[] = [];
  push(rows, "Motor", vehicle.engine);
  push(rows, "Arquitectura", vehicle.specs.engineLayout);
  push(
    rows,
    "Cilindros",
    vehicle.specs.cylinders === null ? null : String(vehicle.specs.cylinders),
  );
  push(rows, "Cilindrada", formatDisplacement(vehicle.specs.displacementCc));
  push(rows, "Alimentación", vehicle.specs.aspiration);
  return rows;
}

export function performanceRows(vehicle: Vehicle): SpecRow[] {
  const rows: SpecRow[] = [];
  const { specs } = vehicle;
  push(rows, powerLabel(vehicle.fuelType), formatHp(specs.powerHp));
  push(rows, "Torque", formatNm(specs.torqueNm));
  push(rows, "0–100 km/h", formatSeconds(specs.accel0100));

  // La punta y su limitador se leen juntos: "250 km/h (limitada
  // electrónicamente)" dice algo que las dos cifras por separado no dicen.
  const top = formatKph(specs.topSpeedKph);
  const limit = formatKph(specs.topSpeedLimitedKph);
  if (top && specs.topSpeedLimited && limit && limit !== top) {
    push(rows, "Velocidad máxima", `${top} · limitada a ${limit}`);
  } else if (top && specs.topSpeedLimited) {
    push(rows, "Velocidad máxima", `${top} (limitada electrónicamente)`);
  } else if (top) {
    push(rows, "Velocidad máxima", top);
  } else if (specs.topSpeedLimited && limit) {
    push(rows, "Velocidad máxima", `${limit} (limitada electrónicamente)`);
  }

  push(rows, "Peso en orden de marcha", formatKg(specs.curbWeightKg));
  push(rows, "Relación peso/potencia", powerToWeight(vehicle));
  return rows;
}

/** Lo general: colores, ciudad, carrocería. */
export function generalRows(vehicle: Vehicle): SpecRow[] {
  const rows: SpecRow[] = [];
  push(rows, "Año", vehicle.year === null ? null : String(vehicle.year));
  push(
    rows,
    "Kilometraje",
    vehicle.mileage === null ? null : `${formatInteger(vehicle.mileage)} km`,
  );
  push(rows, "Carrocería", vehicle.category?.name);
  push(rows, "Color exterior", vehicle.exteriorColor);
  push(rows, "Color interior", vehicle.interiorColor);
  push(rows, "Ciudad", vehicle.city);
  return rows;
}

/**
 * El sistema híbrido o eléctrico, en los bloques en que se entiende: qué
 * pone cada motor, qué batería lleva y cómo se carga. Un bloque sin filas se
 * descarta entero, así que un híbrido del que solo conocemos la batería
 * muestra la batería y nada más.
 */
export function electrificationBlocks(vehicle: Vehicle): SpecBlock[] {
  if (!hasElectricDrive(vehicle.fuelType)) return [];

  const { electrification: e, fuelType } = vehicle;
  const blocks: SpecBlock[] = [];

  if (hasCombustionEngine(fuelType)) {
    const rows: SpecRow[] = [];
    push(rows, "Potencia", formatHp(e.icePowerHp));
    push(rows, "Torque", formatNm(e.iceTorqueNm));
    if (rows.length > 0) blocks.push({ title: "Motor de combustión", rows });
  }

  const electric: SpecRow[] = [];
  push(
    electric,
    "Número de motores",
    e.electricMotorCount === null ? null : String(e.electricMotorCount),
  );
  push(electric, "Disposición", e.electricMotorLayout);
  push(electric, "Potencia", formatHp(e.electricPowerHp));
  push(electric, "Torque", formatNm(e.electricTorqueNm));
  if (electric.length > 0) {
    blocks.push({ title: "Motor eléctrico", rows: electric });
  }

  if (hasTractionBattery(fuelType)) {
    const battery: SpecRow[] = [];
    push(battery, "Capacidad bruta", formatKwh(e.batteryGrossKwh));
    push(battery, "Capacidad útil", formatKwh(e.batteryNetKwh));
    const range = formatKm(e.electricRangeKm);
    if (range) {
      // El ciclo va junto a la cifra o la cifra no significa nada.
      push(
        battery,
        "Autonomía eléctrica",
        e.rangeStandard ? `${range} (${e.rangeStandard})` : range,
      );
    }
    if (battery.length > 0) blocks.push({ title: "Batería", rows: battery });
  }

  if (hasPlugCharging(fuelType)) {
    const charging: SpecRow[] = [];
    push(charging, "Conector", e.chargeConnector);
    push(charging, "Carga AC máxima", formatKw(e.chargeAcKw));
    push(charging, "Carga DC máxima", formatKw(e.chargeDcKw));
    push(charging, "Tiempo de carga", e.chargeTimeNote);
    if (charging.length > 0) blocks.push({ title: "Carga", rows: charging });
  }

  const system: SpecRow[] = [];
  push(system, "Sistema", e.hybridSystem);
  if (system.length > 0) blocks.unshift({ title: "Arquitectura", rows: system });

  return blocks;
}

/**
 * La situación documental, dicha como se dice en Colombia.
 *
 * "No aplica actualmente" es una respuesta, no un hueco: hay vehículos a los
 * que la técnico-mecánica todavía no les toca, y obligar al administrador a
 * inventar una fecha para rellenar la fila sería exactamente lo contrario de
 * lo que esta sección existe para hacer.
 */
export function documentationRows(vehicle: Vehicle): SpecRow[] {
  const rows: SpecRow[] = [];
  const d = vehicle.documentation;

  const soatDate = formatDateOnly(d.soatExpiresOn);
  if (soatDate) {
    push(
      rows,
      "SOAT",
      d.soatValid === false
        ? `Vencido el ${soatDate}`
        : `Vigente hasta el ${soatDate}`,
    );
  } else if (d.soatValid !== null) {
    push(rows, "SOAT", d.soatValid ? "Vigente" : "No vigente");
  }

  if (d.techInspectionApplies === false) {
    push(rows, "Técnico-mecánica", "No aplica actualmente");
  } else {
    const techDate = formatDateOnly(d.techInspectionExpiresOn);
    if (techDate) {
      push(rows, "Técnico-mecánica", `Vigente hasta el ${techDate}`);
    } else if (d.techInspectionApplies === true) {
      push(rows, "Técnico-mecánica", "Aplica");
    }
  }

  if (d.taxStatus) {
    push(
      rows,
      "Impuestos",
      d.taxesPaidThroughYear
        ? `${d.taxStatus} · pagos hasta ${d.taxesPaidThroughYear}`
        : d.taxStatus,
    );
  } else if (d.taxesPaidThroughYear) {
    push(rows, "Impuestos", `Pagos hasta ${d.taxesPaidThroughYear}`);
  }

  push(rows, "Ciudad de matrícula", d.registrationCity);
  push(
    rows,
    "Placa termina en",
    d.plateLastDigit === null ? null : String(d.plateLastDigit),
  );

  const checked = formatDateOnly(d.documentationCheckedOn);
  if (checked) push(rows, "Verificado el", checked);

  return rows;
}

/** Las especificaciones completas, ya repartidas en bloques con contenido. */
export function specBlocks(vehicle: Vehicle): SpecBlock[] {
  const blocks: SpecBlock[] = [
    { title: "General", rows: generalRows(vehicle) },
    { title: "Motor", rows: engineRows(vehicle) },
    { title: "Prestaciones", rows: performanceRows(vehicle) },
  ];
  return blocks.filter((block) => block.rows.length > 0);
}
