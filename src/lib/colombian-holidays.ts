/**
 * Los días festivos de Colombia, para poder contar días HÁBILES.
 *
 * Existe porque los plazos de la Ley 1581 de 2012 están en días hábiles —diez
 * para una consulta (art. 14), quince para un reclamo (art. 15)— y contar
 * solo de lunes a viernes daría una fecha equivocada en los dieciocho
 * festivos del año colombiano. Un plazo mal calculado en la pantalla del
 * equipo es peor que no mostrar ninguno: parece un dato y no lo es.
 *
 * Tres familias, y las tres se comportan distinto:
 *
 *   1. Fechas fijas que NO se trasladan: 1 de enero, 1 de mayo, 20 de julio,
 *      7 de agosto, 8 y 25 de diciembre.
 *   2. Fechas fijas que SÍ se trasladan al lunes siguiente por la Ley 51 de
 *      1983 —la «ley Emiliani»— cuando no caen en lunes.
 *   3. Fechas que dependen de la Pascua. Jueves y Viernes Santo caen donde
 *      caen; Ascensión, Corpus Christi y Sagrado Corazón se trasladan.
 *
 * Todo se calcula en UTC sobre año, mes y día. Usar la zona local haría que
 * `new Date("2026-01-01")` fuera el 31 de diciembre por la tarde en Bogotá y
 * un festivo se corriera un día, que es el mismo error que obliga a guardar
 * los vencimientos del SOAT como `@db.Date`.
 */

/** Un día del calendario, sin hora y sin zona: `AAAA-MM-DD`. */
export type CivilDate = string;

const DAY_MS = 24 * 60 * 60 * 1000;

export function toCivilDate(value: Date): CivilDate {
  return value.toISOString().slice(0, 10);
}

/** El instante de medianoche UTC de un día del calendario. */
function utc(date: CivilDate): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`Fecha no válida: ${date}`);
  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

function fromUtc(ms: number): CivilDate {
  return new Date(ms).toISOString().slice(0, 10);
}

function civil(year: number, month: number, day: number): CivilDate {
  return fromUtc(Date.UTC(year, month - 1, day));
}

/** 0 domingo … 6 sábado, siempre en UTC. */
function weekday(date: CivilDate): number {
  return new Date(utc(date)).getUTCDay();
}

function addDays(date: CivilDate, days: number): CivilDate {
  return fromUtc(utc(date) + days * DAY_MS);
}

/**
 * El lunes siguiente, o el mismo día si ya es lunes. Es el traslado que
 * ordena la Ley 51 de 1983.
 */
function toMonday(date: CivilDate): CivilDate {
  const day = weekday(date);
  if (day === 1) return date;
  // Desde domingo falta 1 día; desde martes faltan 6.
  return addDays(date, (8 - day) % 7);
}

/**
 * Domingo de Pascua por el algoritmo de Meeus/Jones/Butcher para el
 * calendario gregoriano. Es aritmética entera pura: no depende de ninguna
 * tabla que haya que mantener año a año.
 */
export function easterSunday(year: number): CivilDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return civil(year, month, day);
}

/** Los dieciocho festivos de un año, ordenados. */
export function colombianHolidays(year: number): CivilDate[] {
  const easter = easterSunday(year);

  const fixed = [
    civil(year, 1, 1), // Año Nuevo
    civil(year, 5, 1), // Día del Trabajo
    civil(year, 7, 20), // Independencia
    civil(year, 8, 7), // Batalla de Boyacá
    civil(year, 12, 8), // Inmaculada Concepción
    civil(year, 12, 25), // Navidad
  ];

  const moved = [
    civil(year, 1, 6), // Reyes Magos
    civil(year, 3, 19), // San José
    civil(year, 6, 29), // San Pedro y San Pablo
    civil(year, 8, 15), // Asunción de la Virgen
    civil(year, 10, 12), // Día de la Raza
    civil(year, 11, 1), // Todos los Santos
    civil(year, 11, 11), // Independencia de Cartagena
  ].map(toMonday);

  const holyWeek = [
    addDays(easter, -3), // Jueves Santo
    addDays(easter, -2), // Viernes Santo
  ];

  const movedFromEaster = [
    addDays(easter, 43), // Ascensión del Señor
    addDays(easter, 64), // Corpus Christi
    addDays(easter, 71), // Sagrado Corazón
  ].map(toMonday);

  return [...fixed, ...moved, ...holyWeek, ...movedFromEaster].sort();
}

/**
 * Los festivos que hacen falta para contar desde una fecha, cacheados por
 * año. Un plazo de quince días hábiles puede cruzar el fin de año, así que
 * se consulta el año de la fecha y el siguiente.
 */
const cache = new Map<number, Set<CivilDate>>();

function holidaySet(year: number): Set<CivilDate> {
  let set = cache.get(year);
  if (!set) {
    set = new Set(colombianHolidays(year));
    cache.set(year, set);
  }
  return set;
}

export function isColombianHoliday(date: CivilDate): boolean {
  return holidaySet(Number(date.slice(0, 4))).has(date);
}

/** Lunes a viernes que no sea festivo. */
export function isBusinessDay(date: CivilDate): boolean {
  const day = weekday(date);
  if (day === 0 || day === 6) return false;
  return !isColombianHoliday(date);
}

/**
 * La fecha que queda `days` días hábiles después de `from`.
 *
 * El día de partida NO cuenta, aunque sea hábil: los plazos de los artículos
 * 14 y 15 de la Ley 1581 se cuentan desde el día siguiente al de recibo. Con
 * `days` en 0 devuelve la propia fecha de partida.
 */
export function addBusinessDays(from: CivilDate, days: number): CivilDate {
  if (days <= 0) return from;
  let date = from;
  let remaining = days;
  while (remaining > 0) {
    date = addDays(date, 1);
    if (isBusinessDay(date)) remaining -= 1;
  }
  return date;
}
