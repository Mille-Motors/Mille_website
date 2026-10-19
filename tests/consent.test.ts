import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PrivacyNotice } from "@/components/forms/PrivacyNotice";
import {
  CONSENT_ACTIONS,
  CONSENT_TEXTS,
  CONSENT_TYPES,
  DATA_PROCESSING_CONSENT,
  consentSourceLabel,
  splitConsentText,
  vehicleConsentSource,
} from "@/lib/consent";
import { LEGAL_VERSIONS } from "@/lib/legal";
import { consentEvidenceFor, consentTextHash } from "@/server/consent/evidence";
import { inquiryInputSchema } from "@/server/inquiries/schemas";

/**
 * La autorización: qué se muestra, qué se guarda y que las dos sean lo mismo.
 *
 * Es la propiedad que da valor a toda la evidencia. Si el texto visible y el
 * texto guardado pueden divergir, un `ConsentEvent` deja de poder demostrar
 * qué leyó la persona y se convierte en una fila con una fecha.
 */

describe("el texto de la autorización", () => {
  it("se reconstruye exactamente al partirlo para meter el enlace", () => {
    const { before, link, after } = splitConsentText(DATA_PROCESSING_CONSENT);
    assert.equal(before + link + after, DATA_PROCESSING_CONSENT.text);
  });

  it("contiene la frase que se convierte en enlace", () => {
    const { link } = splitConsentText(DATA_PROCESSING_CONSENT);
    assert.equal(link, DATA_PROCESSING_CONSENT.linkPhrase);
  });

  it("devuelve el texto entero si la frase del enlace no aparece", () => {
    // Que alguien edite el texto y olvide `linkPhrase` no puede acabar
    // mostrando algo distinto de lo que se guarda.
    const broken = { ...DATA_PROCESSING_CONSENT, linkPhrase: "no está" };
    const { before, link, after } = splitConsentText(broken);
    assert.equal(link, null);
    assert.equal(before + after, broken.text);
  });

  it("enumera finalidades concretas y no remite a aceptar un documento", () => {
    const text = DATA_PROCESSING_CONSENT.text.toLowerCase();
    // El art. 5 del Decreto 1377 de 2013 pide informar las finalidades
    // específicas. "Acepto la política" no es una autorización.
    assert.ok(text.startsWith("autorizo"));
    assert.ok(text.includes("responder esta solicitud"));
    assert.ok(!text.includes("acepto la política"));
  });

  it("lleva la versión de la política en su identificador", () => {
    assert.equal(
      DATA_PROCESSING_CONSENT.id,
      `data_processing@${LEGAL_VERSIONS.privacy}`,
    );
  });

  it("enlaza a la política de tratamiento", () => {
    assert.equal(DATA_PROCESSING_CONSENT.linkHref, "/privacidad");
  });
});

describe("la huella del texto", () => {
  it("es SHA-256 en hexadecimal", () => {
    const hash = consentTextHash("texto");
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  it("es estable: el mismo texto da la misma huella", () => {
    assert.equal(consentTextHash("texto"), consentTextHash("texto"));
  });

  it("cambia si cambia un solo carácter", () => {
    assert.notEqual(consentTextHash("texto"), consentTextHash("textos"));
  });

  it("la evidencia del servidor describe el texto autoritativo", () => {
    const evidence = consentEvidenceFor("data_processing");
    assert.equal(evidence.textVersion, DATA_PROCESSING_CONSENT.id);
    assert.equal(evidence.textSnapshot, DATA_PROCESSING_CONSENT.text);
    // La comprobación que convierte "guardamos el texto" en "podemos
    // demostrar que es el texto".
    assert.equal(
      evidence.textHash,
      consentTextHash(DATA_PROCESSING_CONSENT.text),
    );
  });
});

describe("el vocabulario del consentimiento", () => {
  it("solo tiene los tipos que existen de verdad", () => {
    // No hay TERMS porque ningún flujo pide aceptar los Términos, y no hay
    // MARKETING porque MILLE no envía comunicaciones comerciales. Un tipo que
    // nadie escribe es infraestructura "por si algún día".
    assert.deepEqual([...CONSENT_TYPES], ["data_processing"]);
  });

  it("no tiene una acción DENIED que nadie pueda registrar", () => {
    // Sin la casilla marcada el formulario no se envía, así que nunca llega
    // una negativa que guardar.
    assert.deepEqual([...CONSENT_ACTIONS], ["granted", "revoked"]);
  });

  it("tiene un texto definido para cada tipo", () => {
    for (const type of CONSENT_TYPES) {
      assert.ok(CONSENT_TEXTS[type], `falta el texto de ${type}`);
      assert.equal(CONSENT_TEXTS[type].consentType, type);
    }
  });

  it("nombra los orígenes de forma legible", () => {
    assert.equal(consentSourceLabel("contacto"), "Formulario de contacto");
    assert.equal(consentSourceLabel("admin"), "Registrado por el equipo");
    assert.match(
      consentSourceLabel(vehicleConsentSource("bmw-m4-competition")),
      /bmw-m4-competition/,
    );
  });
});

describe("la casilla del formulario", () => {
  const html = renderToStaticMarkup(createElement(PrivacyNotice));

  it("no viene preseleccionada", () => {
    // El art. 7 del Decreto 1377 de 2013: el silencio no puede asimilarse a
    // una conducta inequívoca.
    assert.ok(html.includes('type="checkbox"'));
    assert.ok(!html.includes("checked"));
  });

  it("es obligatoria en el navegador", () => {
    assert.ok(html.includes("required"));
  });

  it("muestra EXACTAMENTE el texto que el servidor guarda", () => {
    // Se compara sobre el texto renderizado, sin etiquetas: el enlace parte
    // la frase en tres nodos y lo que importa es que la frase siga entera.
    const rendered = html
      .replace(/<[^>]+>/g, "")
      .replaceAll("&#x27;", "'")
      .replaceAll("&quot;", '"')
      .replaceAll("&amp;", "&");
    assert.ok(
      rendered.includes(DATA_PROCESSING_CONSENT.text),
      "el texto visible no coincide con el que se guarda como prueba",
    );
  });

  it("enlaza la política de tratamiento", () => {
    assert.ok(html.includes('href="/privacidad"'));
  });

  it("tiene una sola casilla: ni términos ni mercadeo", () => {
    const checkboxes = html.match(/type="checkbox"/g) ?? [];
    assert.equal(checkboxes.length, 1);
    assert.ok(!html.toLowerCase().includes("marketing"));
    assert.ok(!html.toLowerCase().includes("novedades"));
  });

  it("asocia el mensaje de error a la casilla", () => {
    const withError = renderToStaticMarkup(
      createElement(PrivacyNotice, { error: "Debes autorizar." }),
    );
    assert.ok(withError.includes('aria-describedby="privacy-consent-error"'));
    assert.ok(withError.includes('aria-invalid="true"'));
    assert.ok(withError.includes('role="alert"'));
  });
});

describe("el servidor exige la autorización", () => {
  const valid = {
    type: "general" as const,
    name: "Ana Ruiz",
    email: "ana@correo.com",
    privacyConsent: true as const,
  };

  it("acepta el envío autorizado", () => {
    assert.equal(inquiryInputSchema.parse(valid).privacyConsent, true);
  });

  it("rechaza el envío sin autorizar", () => {
    assert.throws(() =>
      inquiryInputSchema.parse({ ...valid, privacyConsent: false }),
    );
  });

  it("rechaza el envío sin la casilla", () => {
    assert.throws(() =>
      inquiryInputSchema.parse({
        type: valid.type,
        name: valid.name,
        email: valid.email,
      }),
    );
  });

  it("no acepta un texto ni una IP enviados por el navegador", () => {
    // Lo que el cliente mande de más se descarta: el texto lo resuelve el
    // servidor de su registro y la IP la lee de las cabeceras. Si el schema
    // los aceptara, la prueba dejaría de ser sobre MILLE.
    const parsed = inquiryInputSchema.parse({
      ...valid,
      consentText: "autoricé lo que me convenga",
      ipAddress: "1.2.3.4",
      acceptedAt: "2020-01-01",
    }) as Record<string, unknown>;
    assert.equal(parsed.consentText, undefined);
    assert.equal(parsed.ipAddress, undefined);
    assert.equal(parsed.acceptedAt, undefined);
  });
});
