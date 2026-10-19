import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsOverview } from "@/components/admin/SettingsOverview";
import { ImageRightsForm } from "@/components/admin/ImageRightsForm";
import { LEGAL_CONTACT, LEGAL_VERSIONS, legalIdentityGaps } from "@/lib/legal";
import { DATA_PROCESSING_CONSENT } from "@/lib/consent";
import { site } from "@/data/site";

/**
 * Las pantallas nuevas del Admin.
 *
 * Se comprueban dos cosas que no se ven en un typecheck: que la Configuración
 * diga la VERDAD —canales reales, versiones reales, lo que falta— y no filtre
 * ningún secreto; y que los controles del formulario de procedencia sean
 * usables con teclado y lector de pantalla.
 *
 * `ConsentAdmin` y `PrivacyAdmin` no se renderizan aquí: usan `useRouter` y
 * `useTransition`, que fuera del árbol de Next no tienen contexto. Sus
 * controles salen de los mismos ayudantes `Field`/`Select` que sí se ejercitan
 * abajo —cada control dentro de su `<label>`—, y el build los compila y
 * tipa. Lo que no se puede comprobar aquí se comprueba en el navegador.
 */

describe("Admin · Configuración", () => {
  const html = renderToStaticMarkup(createElement(SettingsOverview));

  it("muestra los cuatro canales reales", () => {
    assert.ok(html.includes(site.url), "falta el dominio");
    assert.ok(html.includes(LEGAL_CONTACT.email), "falta el correo");
    assert.ok(html.includes("@millemotorculture"), "falta Instagram");
    assert.ok(
      site.phone ? html.includes(site.phone.display) : false,
      "falta el WhatsApp",
    );
  });

  it("ya no dice que los canales se activarán después", () => {
    // El texto viejo de la pantalla había dejado de ser verdad.
    assert.ok(!/se activarán/i.test(html));
    assert.ok(!/en su propia fase/i.test(html));
  });

  it("muestra la versión vigente de cada documento legal", () => {
    for (const version of Object.values(LEGAL_VERSIONS)) {
      assert.ok(html.includes(version), `falta la versión ${version}`);
    }
  });

  it("muestra el texto de autorización con el que se recoge el consentimiento", () => {
    assert.ok(html.includes(DATA_PROCESSING_CONSENT.id));
  });

  it("dice exactamente qué falta para cerrar la política", () => {
    const gaps = legalIdentityGaps();
    assert.ok(gaps.length > 0, "este test asume que todavía falta algo");
    for (const gap of gaps) {
      // El texto puede llevar entidades HTML; se compara sin etiquetas.
      const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      assert.ok(plain.includes(gap), `la pantalla no menciona: ${gap}`);
    }
  });

  it("dice que el sitio no procesa pagos", () => {
    assert.ok(/no procesa pagos/i.test(html.replace(/<[^>]+>/g, " ")));
  });

  it("explica por qué no hay banner de cookies", () => {
    const plain = html.replace(/<[^>]+>/g, " ");
    assert.ok(/no hay banner/i.test(plain));
  });

  it("NO filtra ningún secreto ni variable de entorno", () => {
    // La pantalla es de solo lectura y solo muestra valores ya públicos.
    for (const secret of [
      /SUPABASE_SERVICE_ROLE/i,
      /SERVICE_ROLE_KEY/i,
      /DATABASE_URL/i,
      /DIRECT_URL/i,
      /ANON_KEY/i,
      /process\.env/,
      /eyJ[A-Za-z0-9_-]{10,}/, // un JWT de Supabase empieza así
      /postgres(ql)?:\/\//,
    ]) {
      assert.ok(!secret.test(html), `la pantalla filtra ${secret}`);
    }
  });

  it("no es un formulario: los datos legales no se teclean aquí", () => {
    // Un campo editable convertiría un dato legal en algo que se puede
    // escribir mal a las once de la noche, y el sitio lo publicaría.
    assert.ok(!html.includes("<form"));
    assert.ok(!html.includes("<input"));
    assert.ok(!html.includes("<textarea"));
  });
});

describe("Admin · formulario de procedencia", () => {
  const html = renderToStaticMarkup(
    createElement(ImageRightsForm, {
      initial: null,
      busy: false,
      scope: "lot",
      onSubmit: () => {},
    }),
  );

  it("solo exige la fuente", () => {
    // Pedir diez campos para registrar que un propietario mandó las fotos
    // garantizaría que nadie registrara nada.
    const required = html.match(/required/g) ?? [];
    assert.equal(required.length, 1, "debería haber exactamente un required");
    assert.ok(html.includes("<select"), "la fuente es un select");
  });

  it("no preselecciona ninguna fuente real", () => {
    // La primera opción de la lista no es la procedencia de nadie. Lo que
    // React marca como `selected` es el marcador de posición vacío, que es
    // justo lo correcto: comprobar «no hay selected» sería comprobar otra
    // cosa, porque un `<select>` controlado siempre marca su valor actual.
    assert.ok(html.includes("Elige una fuente"));
    const selected = /<option value="([^"]*)" selected="">/.exec(html);
    assert.ok(selected, "el select debería marcar una opción");
    assert.equal(selected[1], "", "hay una fuente preseleccionada");
  });

  it("no marca por defecto la casilla de atribución", () => {
    assert.ok(html.includes('type="checkbox"'));
    assert.ok(!html.includes("checked"));
  });

  it("todos los controles están dentro de una etiqueta", () => {
    // Es lo que hace que funcionen con teclado y con lector de pantalla sin
    // depender de un `id` que alguien se olvide de poner.
    const controls = (html.match(/<(input|select|textarea)\b/g) ?? []).length;
    const labels = (html.match(/<label\b/g) ?? []).length;
    assert.ok(
      labels >= controls,
      `${controls} controles y solo ${labels} etiquetas`,
    );
  });

  it("deshabilita el envío mientras no haya fuente", () => {
    assert.ok(html.includes("disabled"));
  });

  it("no ofrece quitar una procedencia que no existe", () => {
    const plain = html.replace(/<[^>]+>/g, " ");
    assert.ok(!/Quitar procedencia/.test(plain));
  });

  it("sí la ofrece cuando ya hay algo registrado", () => {
    // Corregir un registro equivocado no puede obligar a inventar otro.
    const withRights = renderToStaticMarkup(
      createElement(ImageRightsForm, {
        initial: {
          sourceType: "owner",
          sourceName: "Propietario",
          author: null,
          sourceUrl: null,
          licenseType: null,
          licenseUrl: null,
          licenseRequiresAttribution: false,
          acquiredOn: null,
          authorizedBy: null,
          proofRef: null,
          notes: null,
        },
        busy: false,
        scope: "image",
        onSubmit: () => {},
      }),
    );
    const plain = withRights.replace(/<[^>]+>/g, " ");
    assert.ok(/Quitar procedencia/.test(plain));
  });

  it("explica a qué se aplica lo que se registra", () => {
    const plain = html.replace(/<[^>]+>/g, " ");
    assert.ok(/todas las fotografías de este vehículo/.test(plain));
  });
});
