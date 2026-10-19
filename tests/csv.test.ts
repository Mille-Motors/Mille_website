import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CSV_BOM, csvCell, csvFilename, csvRow, toCsv } from "@/lib/csv";
import {
  CONSENT_CSV_HEADER,
  consentCsv,
  consentCsvRow,
} from "@/server/consent/export";
import type { ConsentEventView } from "@/types/consent";

/**
 * La exportación de evidencia.
 *
 * Lo que de verdad se comprueba aquí es la inyección de fórmulas. El CSV de
 * consentimientos lleva nombres y agentes de navegador que escribe gente de
 * fuera, y una celda que empieza por `=` la ejecuta Excel al abrir el
 * archivo. Un nombre como `=HYPERLINK(...)` convertiría la prueba en un
 * ataque contra el abogado que la abre.
 */

describe("neutralización de fórmulas", () => {
  it("desactiva lo que una hoja de cálculo ejecutaría", () => {
    for (const payload of [
      "=1+1",
      "+1",
      "-1",
      "@SUM(A1)",
      '=HYPERLINK("http://malo.example","clic")',
      "=cmd|'/c calc'!A1",
    ]) {
      const cell = csvCell(payload);
      // Con apóstrofo delante, la hoja lo trata como texto.
      assert.ok(
        cell.startsWith("'") || cell.startsWith(`"'`),
        `no se neutralizó: ${cell}`,
      );
    }
  });

  it("neutraliza también el tabulador y el retorno de carro iniciales", () => {
    assert.ok(csvCell("\t=1+1").includes("'\t=1+1"));
    assert.ok(csvCell("\r=1+1").includes("'\r=1+1"));
  });

  it("no toca un texto normal", () => {
    assert.equal(csvCell("Ana Ruiz"), "Ana Ruiz");
    assert.equal(csvCell("2026-10-19T12:00:00.000Z"), "2026-10-19T12:00:00.000Z");
  });

  it("no toca una IP, que empieza por dígito", () => {
    assert.equal(csvCell("190.85.1.2"), "190.85.1.2");
  });
});

describe("escapado RFC 4180", () => {
  it("cita lo que lleva coma", () => {
    assert.equal(csvCell("Ruiz, Ana"), '"Ruiz, Ana"');
  });

  it("duplica la comilla interior", () => {
    assert.equal(csvCell('Ana "la jefa"'), '"Ana ""la jefa"""');
  });

  it("cita lo que lleva salto de línea", () => {
    assert.equal(csvCell("una\ndos"), '"una\ndos"');
  });

  it("escribe vacío para lo ausente", () => {
    // Importa: una columna vacía se lee como "no se conserva ese dato", y eso
    // es información. No se rellena con "null" ni con "-".
    assert.equal(csvCell(null), "");
    assert.equal(csvCell(undefined), "");
  });

  it("conserva el cero y el falso", () => {
    assert.equal(csvCell(0), "0");
    assert.equal(csvCell(false), "false");
  });

  it("une las celdas con coma", () => {
    assert.equal(csvRow(["a", "b", null, 1]), "a,b,,1");
  });
});

describe("el documento", () => {
  const csv = toCsv(["id", "texto"], [["1", "hola"], ["2", "=mal"]]);

  it("empieza con la marca que hace que Excel lea UTF-8", () => {
    // Sin esto, "José" se abre como "JosÃ©" en Excel para Windows.
    assert.ok(csv.startsWith(CSV_BOM));
  });

  it("separa las filas con CRLF", () => {
    assert.ok(csv.includes("\r\n"));
    assert.ok(csv.endsWith("\r\n"));
  });

  it("pone la cabecera primero", () => {
    assert.equal(csv.slice(CSV_BOM.length).split("\r\n")[0], "id,texto");
  });

  it("neutraliza también dentro del documento", () => {
    assert.ok(csv.includes("'=mal"));
  });
});

describe("nombre del archivo", () => {
  it("lleva la fecha", () => {
    const name = csvFilename("mille-consentimientos", new Date("2026-10-19T15:00:00Z"));
    assert.equal(name, "mille-consentimientos-2026-10-19.csv");
  });

  it("no deja caracteres que permitan inyectar una cabecera HTTP", () => {
    const name = csvFilename('mal"; drop\r\nX-Evil: 1');
    assert.ok(!name.includes('"'));
    assert.ok(!name.includes("\r"));
    assert.ok(!name.includes("\n"));
    assert.ok(!name.includes(";"));
  });
});

describe("el CSV de consentimientos", () => {
  /** Un evento completo, como el que escribe un formulario público. */
  const granted: ConsentEventView = {
    id: "11111111-1111-4111-8111-111111111111",
    createdAt: "2026-10-19T19:57:17.692Z",
    consentType: "data_processing",
    action: "granted",
    source: "contacto",
    policyVersion: "2026-10-19",
    textVersion: "data_processing@2026-10-19",
    textHash: "6e909ee09df8e8fb" + "0".repeat(48),
    textSnapshot: "Autorizo a MILLE…",
    ipAddress: "190.85.1.2",
    ipSource: "x-vercel-forwarded-for",
    userAgent: "Mozilla/5.0",
    requestId: "bog1::abc",
    inquiryId: "22222222-2222-4222-8222-222222222222",
    titular: {
      name: "Ana Ruiz",
      email: "ana@correo.com",
      phone: "+57 310 555 4433",
      vehicleLabel: "BMW M4 Competition 2021",
    },
    textEvidenceAvailable: true,
  };

  it("la cabecera y la fila tienen el MISMO número de columnas", () => {
    // Es lo que se rompe en silencio: añadir una columna a la cabecera y
    // olvidarla en la fila corre todos los valores una posición, y el CSV
    // sigue abriéndose sin error con las IPs bajo "agente_usuario".
    assert.equal(consentCsvRow(granted).length, CONSENT_CSV_HEADER.length);
  });

  it("incluye lo que hace falta para reconstruir la autorización", () => {
    const csv = consentCsv([granted]);
    for (const needed of [
      granted.policyVersion,
      granted.textVersion!,
      granted.textHash!,
      granted.ipAddress!,
      granted.ipSource!,
      granted.createdAt,
    ]) {
      assert.ok(csv.includes(needed), `falta en el CSV: ${needed}`);
    }
  });

  it("dice que la IP de una autorización es del titular", () => {
    assert.ok(consentCsv([granted]).includes("titular"));
  });

  it("dice que la IP de una revocatoria es del EQUIPO", () => {
    // La teclea el equipo cuando llega por correo o WhatsApp. No decirlo
    // invitaría a leerla como si fuera del titular.
    const revoked: ConsentEventView = {
      ...granted,
      action: "revoked",
      source: "admin",
    };
    assert.ok(consentCsv([revoked]).includes("equipo de MILLE"));
  });

  it("marca el evento heredado en vez de dejar columnas vacías sin explicar", () => {
    const legacy: ConsentEventView = {
      ...granted,
      textVersion: null,
      textHash: null,
      textSnapshot: null,
      textEvidenceAvailable: false,
    };
    assert.ok(consentCsv([legacy]).includes("no disponible (evento heredado)"));
  });

  it("neutraliza un nombre que una hoja de cálculo ejecutaría", () => {
    // El nombre lo escribe gente de fuera. Es la vía real del ataque.
    const hostile: ConsentEventView = {
      ...granted,
      titular: { ...granted.titular!, name: '=HYPERLINK("http://malo.example")' },
    };
    const csv = consentCsv([hostile]);
    assert.ok(csv.includes("'=HYPERLINK") || csv.includes(`"'=HYPERLINK`));
  });
});
