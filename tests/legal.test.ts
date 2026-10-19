import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Footer } from "@/components/layout/Footer";
import { site } from "@/data/site";
import {
  CONSUMER_AUTHORITY,
  LEGAL_CONTACT,
  LEGAL_DOCUMENTS,
  LEGAL_PATHS,
  LEGAL_RESPONSIBLES,
  LEGAL_TITLES,
  LEGAL_VERSIONS,
  formatLegalVersion,
  legalIdentityGaps,
  responsibleIdentified,
} from "@/lib/legal";

/**
 * Las barreras contra el dato legal inventado.
 *
 * Varias de estas pruebas recorren el código fuente, que es poco habitual y
 * aquí está justificado: lo que protegen no es el comportamiento de una
 * función, es que nadie —ni una persona con prisa ni un agente— vuelva a
 * meter un correo de relleno, una pasarela de pago o una razón social que no
 * existe. Un error así no rompe ninguna prueba de comportamiento: se publica
 * y queda publicado.
 */

const SRC = path.join(process.cwd(), "src");

function sourceFiles(dir = SRC): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    // El cliente de Prisma es código generado: no es nuestro y no se audita.
    if (full.includes(`${path.sep}generated${path.sep}`)) continue;
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const FILES = sourceFiles();

/** Busca un patrón en todo `src` y devuelve dónde aparece. */
function occurrences(pattern: RegExp): string[] {
  const hits: string[] = [];
  for (const file of FILES) {
    const text = readFileSync(file, "utf8");
    for (const [index, line] of text.split("\n").entries()) {
      if (pattern.test(line)) {
        hits.push(`${path.relative(process.cwd(), file)}:${index + 1}`);
      }
      pattern.lastIndex = 0;
    }
  }
  return hits;
}

describe("versiones legales", () => {
  it("son fuente única y tienen formato de fecha", () => {
    for (const document of LEGAL_DOCUMENTS) {
      assert.match(
        LEGAL_VERSIONS[document],
        /^\d{4}-\d{2}-\d{2}$/,
        `${document} no tiene una versión con forma de fecha`,
      );
    }
  });

  it("se leen como fecha sin corrimiento de zona", () => {
    // `new Date("2026-10-19")` es medianoche UTC, que en Bogotá es el 18 por
    // la tarde: la fecha publicada se correría un día.
    assert.equal(formatLegalVersion("2026-10-19"), "19 de octubre de 2026");
    assert.equal(formatLegalVersion("2026-01-01"), "1 de enero de 2026");
    assert.equal(formatLegalVersion("2026-12-31"), "31 de diciembre de 2026");
  });

  it("devuelve la cadena tal cual si no es una fecha", () => {
    assert.equal(formatLegalVersion("v2"), "v2");
  });

  it("tienen ruta y título", () => {
    for (const document of LEGAL_DOCUMENTS) {
      assert.ok(LEGAL_PATHS[document].startsWith("/"));
      assert.ok(LEGAL_TITLES[document].length > 0);
    }
  });

  it("ninguna página escribe su fecha legible a mano", () => {
    // Era el caso: tres páginas con `const UPDATED = "17 de octubre de 2026"`
    // y la versión en otro archivo. Una corrección podía mover el texto sin
    // mover la versión, y entonces un consentimiento guardado contra esa
    // versión dejaba de poder demostrar qué se mostró.
    assert.deepEqual(occurrences(/const UPDATED\s*=/), []);
  });
});

describe("identificación del Responsable", () => {
  it("no se inventa ninguna", () => {
    // Si algún día se rellena, cada entrada tiene que traer nombre e
    // identificación completos. Lo que no puede haber es un marcador.
    for (const responsible of LEGAL_RESPONSIBLES) {
      assert.ok(responsible.legalName.trim().length > 0);
      assert.ok(responsible.identification.trim().length > 0);
      assert.ok(
        !/pendiente|aqu[íi]|xxx|nombre|123456/i.test(responsible.legalName),
        `nombre de relleno: ${responsible.legalName}`,
      );
    }
  });

  it("informa de lo que falta en vez de callarlo", () => {
    const gaps = legalIdentityGaps();
    if (responsibleIdentified() && LEGAL_CONTACT.physicalAddress) {
      assert.deepEqual(gaps, []);
    } else {
      assert.ok(gaps.length > 0, "falta algo y nadie lo está diciendo");
    }
  });

  it("no publica una dirección física sin confirmar", () => {
    if (LEGAL_CONTACT.physicalAddress === null) return;
    assert.ok(
      !/pendiente|direcci[óo]n aqu[íi]|calle 123/i.test(
        LEGAL_CONTACT.physicalAddress,
      ),
    );
  });

  it("no declara una personería jurídica que no existe", () => {
    // MILLE no es una sociedad constituida. Mientras no lo sea, ni "S.A.S."
    // ni un NIT pueden aparecer en el código que el sitio publica.
    assert.deepEqual(
      occurrences(/MILLE\s+(Motor\s+Culture\s+)?S\.?A\.?S\.?/i),
      [],
    );
    assert.deepEqual(occurrences(/NIT\s*[:nº]?\s*\d/i), []);
  });
});

describe("canales oficiales", () => {
  it("el correo es el confirmado por el fundador", () => {
    assert.equal(site.email, "millemotorculture@gmail.com");
    assert.equal(LEGAL_CONTACT.email, site.email);
  });

  it("no hay buzones por función inventados", () => {
    // Nadie lee privacy@ ni legal@: no existe dominio de correo propio, y una
    // dirección que nadie atiende no es un canal de atención.
    for (const fake of [
      /privacy@/i,
      /privacidad@/i,
      /legal@/i,
      /contacto@/i,
      /info@/i,
      /hola@/i,
      /soporte@/i,
      /no-?reply@mille/i,
    ]) {
      assert.deepEqual(occurrences(fake), [], `buzón inventado: ${fake}`);
    }
  });

  it("el dominio oficial es el único canónico", () => {
    assert.equal(site.url, "https://millemotorculture.com");
    assert.equal(site.officialUrl, site.url);
  });

  it("Instagram es la cuenta real", () => {
    assert.equal(site.instagram?.handle, "@millemotorculture");
  });

  it("el WhatsApp sale de la configuración y no de un número de relleno", () => {
    assert.ok(site.phone, "no hay línea configurada");
    // Solo dígitos, como exige wa.me, y nada de 123456789 ni 300 000 0000.
    assert.match(site.phone.number, /^\d{10,15}$/);
    assert.ok(!/^(\d)\1+$/.test(site.phone.number));
    assert.ok(!site.phone.number.includes("123456789"));
  });

  it("el domicilio es el real", () => {
    assert.match(LEGAL_CONTACT.domicile, /Bogot/);
  });
});

describe("ausencia de pagos en línea", () => {
  /**
   * Los nombres de las pasarelas que no deben estar.
   *
   * Se buscan donde una integración REAL dejaría rastro —una importación, una
   * variable de entorno, una llamada a un constructor— y no en texto libre.
   * Buscarlos a secas daba un falso positivo tonto y revelador: una de las
   * fotografías del inventario vive en una URL de Unsplash que describe «white
   * and gray stripe textile». Una prueba que falla por el nombre de una foto
   * se acaba desactivando, y entonces deja de proteger nada.
   */
  const VENDORS = [
    "stripe",
    "wompi",
    "mercadopago",
    "payu",
    "epayco",
    "paypal",
    "nequi",
    "daviplata",
  ];

  it("no hay ninguna pasarela importada", () => {
    for (const vendor of VENDORS) {
      const imported = new RegExp(
        `(from|require\\()\\s*["'\`][^"'\`]*${vendor}`,
        "i",
      );
      assert.deepEqual(occurrences(imported), [], `pasarela importada: ${vendor}`);
    }
  });

  it("no hay ninguna pasarela en las dependencias del proyecto", () => {
    const pkg = JSON.parse(
      readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    for (const vendor of VENDORS) {
      const found = names.filter((name) => name.toLowerCase().includes(vendor));
      assert.deepEqual(found, [], `dependencia de pagos: ${found.join(", ")}`);
    }
  });

  it("no hay credenciales ni claves de pasarela en el entorno", () => {
    for (const vendor of VENDORS) {
      const envVar = new RegExp(`process\\.env\\.[A-Z0-9_]*${vendor}`, "i");
      assert.deepEqual(occurrences(envVar), [], `variable de pagos: ${vendor}`);
    }
  });

  it("no hay modelo ni endpoint de pagos, reembolsos o checkout", () => {
    for (const concept of [
      /\bcheckout\b/i,
      /\brefunds?\b/i,
      /payment[-_]?(webhook|intent|method)/i,
      /\breembolso/i,
      /reversi[óo]n del pago/i,
    ]) {
      const hits = occurrences(concept).filter(
        // Las páginas legales y la pantalla de Configuración SÍ mencionan que
        // no hay reembolsos ni reversión del pago, y eso es exactamente lo
        // que deben decir. Lo que no puede haber es lógica de pagos.
        (hit) =>
          !hit.includes("(public)/terminos") &&
          !hit.includes("SettingsOverview"),
      );
      assert.deepEqual(hits, [], `lógica de pagos encontrada: ${concept}`);
    }
  });
});

describe("el pie del sitio", () => {
  const html = renderToStaticMarkup(createElement(Footer));

  it("enlaza los tres documentos legales", () => {
    for (const document of LEGAL_DOCUMENTS) {
      assert.ok(
        html.includes(`href="${LEGAL_PATHS[document]}"`),
        `el pie no enlaza ${LEGAL_PATHS[document]}`,
      );
    }
  });

  it("enlaza la autoridad de protección al consumidor", () => {
    // Art. 50, parágrafo, de la Ley 1480 de 2011: un enlace visible y
    // fácilmente identificable.
    assert.ok(html.includes(CONSUMER_AUTHORITY.url));
    assert.ok(html.includes(CONSUMER_AUTHORITY.shortName));
  });

  it("enlaza los canales reales y ninguno más", () => {
    assert.ok(html.includes(`mailto:${LEGAL_CONTACT.email}`));
    assert.ok(html.includes("instagram.com/millemotorculture"));
    assert.ok(html.includes(`wa.me/${site.phone?.number}`));
  });

  it("no ofrece preferencias de cookies, porque no hay nada opcional", () => {
    // El sitio público solo usa almacenamiento estrictamente necesario. Un
    // enlace a preferencias que no gobiernan nada sería un adorno.
    assert.ok(!/preferencias de cookies/i.test(html));
  });

  it("abre los enlaces externos sin filtrar la referencia", () => {
    assert.ok(html.includes('rel="noreferrer noopener"'));
  });
});
