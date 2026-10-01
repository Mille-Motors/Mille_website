/**
 * Escribir una fecha como se escribe una fecha.
 *
 * El `<input type="date">` del navegador obliga a trabajar por segmentos:
 * se teclea el día, el foco salta solo al mes, y corregir algo exige volver
 * con el ratón. Para rellenar tres fechas de documentación por vehículo es
 * exasperante.
 *
 * Aquí la fecha se teclea seguida —`01102026`— y estas funciones ponen las
 * barras. El calendario del navegador sigue estando a un clic, para quien
 * prefiera buscar el día.
 *
 * Todo esto trabaja con CADENAS. Nunca se construye un `Date` para formatear
 * ni para parsear: `new Date("2026-10-01")` es medianoche UTC y en Bogotá
 * cae el 30 de septiembre, que es exactamente el error que estas funciones
 * existen para no cometer.
 */

/** Lo que se guarda: "2026-10-01". */
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Lo que se lee en Colombia: "01/10/2026". */
const DISPLAY = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** ¿Existe ese día en el calendario? El 31 de febrero no. */
export function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  // Se compara contra UTC para no depender de la zona de quien ejecuta.
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/** "2026-10-01" -> "01/10/2026". Vacío si no es una fecha. */
export function isoToDisplay(iso: string | null): string {
  if (!iso) return "";
  const match = ISO.exec(iso.trim());
  if (!match) return "";
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/**
 * "01/10/2026" -> "2026-10-01", o `null` si todavía no es una fecha
 * completa y real. Devolver null a medio escribir es lo que permite teclear
 * sin que el campo pelee.
 */
export function displayToIso(display: string): string | null {
  const match = DISPLAY.exec(display.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  if (!isRealDate(Number(year), Number(month), Number(day))) return null;
  return `${year}-${month}-${day}`;
}

/**
 * Pone las barras mientras se escribe, y solo eso.
 *
 * No corrige ni completa: "99" sigue siendo "99" hasta que la persona lo
 * arregle. Un campo que reescribe lo que acabas de teclear es peor que uno
 * que te deja equivocarte.
 */
export function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Qué decirle a quien escribió algo que no es una fecha. */
export function dateInputError(display: string): string | null {
  const clean = display.trim();
  if (clean === "") return null;
  if (!DISPLAY.test(clean)) return "Escribe la fecha como DD/MM/AAAA.";
  return displayToIso(clean) === null ? "Esa fecha no existe." : null;
}
