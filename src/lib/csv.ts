/**
 * CSV, escrito a mano y con cuidado.
 *
 * Son treinta líneas y una dependencia menos, pero no está aquí por ahorrar:
 * está aquí por las dos cosas que casi ningún generador de CSV hace y que en
 * una exportación de evidencia importan.
 *
 * 1. INYECCIÓN DE FÓRMULAS. Una celda que empieza por `=`, `+`, `-`, `@`,
 *    tabulador o retorno de carro la interpreta Excel —y LibreOffice, y
 *    Sheets— como una fórmula. Varios de los campos que se exportan los
 *    escribe gente de fuera: el nombre de quien rellenó el formulario, el
 *    agente de usuario que mandó su navegador. Un nombre como
 *    `=HYPERLINK("http://…")` convierte la evidencia en un ataque contra
 *    quien la abre. Se desactiva poniendo un apóstrofo delante, que es lo
 *    que esas hojas de cálculo entienden como «esto es texto».
 *
 * 2. BOM. Sin la marca de orden de bytes, Excel en Windows abre el archivo
 *    como Latin-1 y «José» aparece como «JosÃ©». Es un detalle tonto hasta
 *    que el documento tiene que servir de prueba.
 *
 * El resto es RFC 4180: comillas dobles alrededor de lo que lleva coma,
 * comilla o salto de línea, y la comilla interior duplicada.
 */

/** Lo que una hoja de cálculo podría tomarse por fórmula. */
const RISKY_PREFIX = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  let text = typeof value === "string" ? value : String(value);

  // Antes de citar: si la hoja lo leería como fórmula, se marca como texto.
  if (RISKY_PREFIX.test(text)) text = `'${text}`;

  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function csvRow(cells: readonly unknown[]): string {
  return cells.map(csvCell).join(",");
}

/** La marca que hace que Excel lea UTF-8. */
export const CSV_BOM = "﻿";

/**
 * El documento entero. `\r\n` porque es lo que dice el RFC y lo que menos
 * sorpresas da en Windows.
 */
export function toCsv(
  header: readonly string[],
  rows: readonly (readonly unknown[])[],
): string {
  return CSV_BOM + [csvRow(header), ...rows.map(csvRow)].join("\r\n") + "\r\n";
}

/**
 * Un nombre de archivo con la fecha, seguro para una cabecera HTTP.
 *
 * Solo letras, dígitos, guiones y puntos: un nombre con comillas o saltos de
 * línea permitiría inyectar cabeceras en la respuesta.
 */
export function csvFilename(base: string, date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  const safe = base.replace(/[^a-zA-Z0-9-]/g, "-");
  return `${safe}-${stamp}.csv`;
}
