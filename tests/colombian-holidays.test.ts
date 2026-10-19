import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addBusinessDays,
  colombianHolidays,
  easterSunday,
  isBusinessDay,
  isColombianHoliday,
} from "@/lib/colombian-holidays";

/**
 * Los festivos colombianos, que es de lo que dependen los plazos legales.
 *
 * Importa de verdad: los arts. 14 y 15 de la Ley 1581 de 2012 dan diez y
 * quince días HÁBILES para atender una consulta y un reclamo. Contar solo de
 * lunes a viernes daría una fecha equivocada dieciocho veces al año, y un
 * vencimiento mal calculado en la pantalla del equipo es peor que no mostrar
 * ninguno: parece un dato y no lo es.
 */

describe("domingo de Pascua", () => {
  // Fechas conocidas. Si el algoritmo se rompiera, lo haría en silencio y se
  // llevaría por delante cinco festivos de cada año.
  const known: Record<number, string> = {
    2024: "2024-03-31",
    2025: "2025-04-20",
    2026: "2026-04-05",
    2027: "2027-03-28",
    2028: "2028-04-16",
    2030: "2030-04-21",
  };

  for (const [year, date] of Object.entries(known)) {
    it(`cae el ${date} en ${year}`, () => {
      assert.equal(easterSunday(Number(year)), date);
    });
  }
});

describe("festivos de Colombia", () => {
  it("son dieciocho al año", () => {
    for (const year of [2025, 2026, 2027, 2028]) {
      assert.equal(
        colombianHolidays(year).length,
        18,
        `${year} no tiene dieciocho festivos`,
      );
    }
  });

  it("no repite ninguno", () => {
    const days = colombianHolidays(2026);
    assert.equal(new Set(days).size, days.length);
  });

  it("deja donde caen los que no se trasladan", () => {
    // Año Nuevo, Trabajo, Independencia, Boyacá, Inmaculada y Navidad.
    for (const day of [
      "2026-01-01",
      "2026-05-01",
      "2026-07-20",
      "2026-08-07",
      "2026-12-08",
      "2026-12-25",
    ]) {
      assert.ok(isColombianHoliday(day), `${day} debería ser festivo`);
    }
  });

  it("traslada al lunes los de la Ley 51 de 1983", () => {
    // Reyes es el 6 de enero, que en 2026 es martes: se corre al lunes 12.
    assert.ok(isColombianHoliday("2026-01-12"));
    assert.ok(!isColombianHoliday("2026-01-06"));

    // San José, 19 de marzo, jueves en 2026: al lunes 23.
    assert.ok(isColombianHoliday("2026-03-23"));
    assert.ok(!isColombianHoliday("2026-03-19"));

    // Asunción, 15 de agosto, sábado en 2026: al lunes 17.
    assert.ok(isColombianHoliday("2026-08-17"));
    assert.ok(!isColombianHoliday("2026-08-15"));

    // Todos los Santos, 1 de noviembre, domingo en 2026: al lunes 2.
    assert.ok(isColombianHoliday("2026-11-02"));
    assert.ok(!isColombianHoliday("2026-11-01"));
  });

  it("no traslada el que ya cae en lunes", () => {
    // El 12 de octubre de 2026 es lunes: se queda.
    assert.ok(isColombianHoliday("2026-10-12"));
  });

  it("respeta Jueves y Viernes Santo donde caen", () => {
    // Pascua 2026: domingo 5 de abril. No se trasladan nunca.
    assert.ok(isColombianHoliday("2026-04-02"));
    assert.ok(isColombianHoliday("2026-04-03"));
  });

  it("traslada al lunes los festivos que cuelgan de la Pascua", () => {
    // Ascensión, Corpus Christi y Sagrado Corazón: +43, +64 y +71.
    assert.ok(isColombianHoliday("2026-05-18"));
    assert.ok(isColombianHoliday("2026-06-08"));
    assert.ok(isColombianHoliday("2026-06-15"));
  });

  it("los festivos trasladados siempre caen en lunes", () => {
    // Todos menos las seis fechas fijas y los dos días de Semana Santa.
    const fixed = new Set([
      "2027-01-01",
      "2027-05-01",
      "2027-07-20",
      "2027-08-07",
      "2027-12-08",
      "2027-12-25",
      // Jueves y Viernes Santo de 2027 (Pascua: 28 de marzo).
      "2027-03-25",
      "2027-03-26",
    ]);
    for (const day of colombianHolidays(2027)) {
      if (fixed.has(day)) continue;
      const weekday = new Date(`${day}T00:00:00.000Z`).getUTCDay();
      assert.equal(weekday, 1, `${day} debería ser lunes`);
    }
  });
});

describe("días hábiles", () => {
  it("excluye fines de semana y festivos", () => {
    assert.ok(isBusinessDay("2026-10-19")); // lunes corriente
    assert.ok(!isBusinessDay("2026-10-17")); // sábado
    assert.ok(!isBusinessDay("2026-10-18")); // domingo
    assert.ok(!isBusinessDay("2026-10-12")); // festivo en lunes
  });

  it("no cuenta el día de partida", () => {
    // Los plazos de los arts. 14 y 15 corren desde el día SIGUIENTE al recibo.
    assert.equal(addBusinessDays("2026-10-19", 1), "2026-10-20");
  });

  it("salta por encima del fin de semana", () => {
    // Viernes 16 + 1 hábil = lunes 19.
    assert.equal(addBusinessDays("2026-10-16", 1), "2026-10-19");
  });

  it("salta por encima de un festivo", () => {
    // Viernes 9 + 1 hábil: el lunes 12 es festivo, así que cae el martes 13.
    assert.equal(addBusinessDays("2026-10-09", 1), "2026-10-13");
  });

  it("cuenta diez hábiles descontando el festivo del 2 de noviembre", () => {
    // Desde el lunes 19 de octubre: cuatro días esa semana, cinco la
    // siguiente, y el décimo se va al 3 de noviembre porque el 2 es festivo.
    assert.equal(addBusinessDays("2026-10-19", 10), "2026-11-03");
  });

  it("devuelve la misma fecha con cero o menos", () => {
    assert.equal(addBusinessDays("2026-10-19", 0), "2026-10-19");
    assert.equal(addBusinessDays("2026-10-19", -3), "2026-10-19");
  });

  it("cruza el fin de año sin perderse", () => {
    const due = addBusinessDays("2026-12-23", 15);
    assert.ok(due > "2027-01-01", `${due} debería caer ya en 2027`);
    assert.ok(isBusinessDay(due));
  });

  it("rechaza una fecha con otro formato", () => {
    assert.throws(() => addBusinessDays("19/10/2026", 1));
  });
});
