import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ShareButton } from "@/components/vehicle/ShareButton";
import { socialImageUrl, socialImageWarmUrl } from "@/lib/seo";
import {
  canShareNatively,
  copyText,
  shareTargets,
  vehiclePublicUrl,
  vehicleShareText,
} from "@/lib/share";

/**
 * Compartir una ficha: a dónde se puede mandar, con qué texto, y qué imagen
 * sale en la tarjeta de vista previa.
 */

const input = {
  url: "https://millemotorculture.com/vehiculos/ducati-multistrada-1200s-pikes-peak",
  title: "Ducati Multistrada 1200S Pikes Peak",
  text: "Ducati Multistrada 1200S Pikes Peak, $ 98.000.000 COP, en MILLE.",
};

describe("los destinos para compartir", () => {
  const targets = shareTargets(input);
  const byId = (id: string) => targets.find((target) => target.id === id)!;

  it("son WhatsApp, Facebook y correo; Instagram no tiene dirección web para compartir", () => {
    assert.deepEqual(
      targets.map((target) => target.id),
      ["whatsapp", "facebook", "email"],
    );
    assert.ok(!targets.some((target) => /instagram/i.test(target.href)));
  });

  it("WhatsApp lleva el texto y el enlace, codificados", () => {
    const href = new URL(byId("whatsapp").href);
    assert.equal(href.origin + href.pathname, "https://wa.me/");
    assert.equal(href.searchParams.get("text"), `${input.text} ${input.url}`);
  });

  it("Facebook recibe solo la dirección de la ficha", () => {
    const href = new URL(byId("facebook").href);
    assert.equal(href.searchParams.get("u"), input.url);
  });

  it("el correo trae el título de asunto y el enlace en el cuerpo", () => {
    const href = byId("email").href;
    assert.ok(href.startsWith("mailto:?"));
    const params = new URLSearchParams(href.slice("mailto:?".length));
    assert.equal(params.get("subject"), input.title);
    assert.ok(params.get("body")!.includes(input.url));
    assert.ok(params.get("body")!.includes(input.text));
  });

  it("un título con caracteres especiales no rompe la dirección", () => {
    const tricky = shareTargets({ ...input, title: "BMW M3 & Cía.", text: "100% auténtico ¿sí?" });
    for (const target of tricky) {
      assert.doesNotThrow(() => new URL(target.href.replace("mailto:", "https://x.test/")));
    }
    const whatsapp = new URL(tricky[0].href);
    assert.ok(whatsapp.searchParams.get("text")!.includes("100% auténtico ¿sí?"));
  });
});

describe("el texto que acompaña al enlace", () => {
  it("dice qué es y de dónde viene", () => {
    assert.equal(
      vehicleShareText("Ducati Multistrada", "$ 98.000.000 COP"),
      "Ducati Multistrada, $ 98.000.000 COP, en MILLE.",
    );
  });

  it("sin precio no inventa uno", () => {
    assert.equal(vehicleShareText("Ducati Multistrada", null), "Ducati Multistrada, en MILLE.");
  });
});

describe("la dirección pública de una ficha", () => {
  it("es la del sitio, no la del lugar desde el que se copia", () => {
    assert.equal(
      vehiclePublicUrl("ducati-multistrada-1200s-pikes-peak"),
      "https://millemotorculture.com/vehiculos/ducati-multistrada-1200s-pikes-peak",
    );
  });
});

describe("la hoja de compartir del sistema", () => {
  it("se usa solo donde existe", () => {
    assert.equal(canShareNatively({ share: () => Promise.resolve() }), true);
    assert.equal(canShareNatively({}), false);
    assert.equal(canShareNatively(undefined), false);
  });
});

describe("copiar al portapapeles", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, "navigator", original);
  });

  it("usa el portapapeles del navegador y dice que lo logró", async () => {
    let copied = "";
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { clipboard: { writeText: async (text: string) => void (copied = text) } },
    });
    assert.equal(await copyText("https://x.test/a"), true);
    assert.equal(copied, "https://x.test/a");
  });

  it("si el permiso se deniega y no hay documento, dice la verdad: no se copió", async () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        clipboard: {
          writeText: async () => {
            throw new Error("denegado");
          },
        },
      },
    });
    assert.equal(await copyText("https://x.test/a"), false);
  });
});

describe("el botón Compartir", () => {
  const html = renderToStaticMarkup(createElement(ShareButton, input));

  it("es un botón con su nombre a la vista", () => {
    assert.match(html, /<button[^>]*type="button"/);
    assert.match(html, />Compartir</);
  });

  it("nace cerrado: el menú solo existe cuando se abre", () => {
    assert.match(html, /aria-expanded="false"/);
    assert.ok(!html.includes("Copiar enlace"));
    assert.ok(!html.includes("wa.me"));
  });

  it("mide lo mínimo para tocarlo con el dedo", () => {
    assert.ok(html.includes("min-h-11"));
  });
});

describe("la imagen de la tarjeta de vista previa", () => {
  const original = process.env.NEXT_PUBLIC_SUPABASE_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = original;
  });

  const stored =
    "https://abc123.supabase.co/storage/v1/object/public/vehicle-images/vehicles/v1/foto.jpg";

  it("una foto de Supabase se pide REDUCIDA, no el original de varios MB", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    const url = new URL(socialImageUrl(stored));
    assert.equal(url.origin, "https://millemotorculture.com");
    assert.equal(url.pathname, "/_next/image");
    assert.equal(url.searchParams.get("url"), stored);
    assert.equal(url.searchParams.get("w"), "1200");
    assert.equal(url.searchParams.get("q"), "75");
  });

  it("el ancho pedido es uno de los que el sitio sirve", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    // 1200 está en `deviceSizes` de next.config.ts; otro valor daría un 400.
    assert.equal(new URL(socialImageUrl(stored)).searchParams.get("w"), "1200");
  });

  it("una foto local también se reduce, con ruta absoluta", () => {
    const url = new URL(socialImageUrl("/images/vehicles/bmw-x5/01.jpg"));
    assert.equal(url.pathname, "/_next/image");
    assert.equal(url.searchParams.get("url"), "/images/vehicles/bmw-x5/01.jpg");
  });

  it("una dirección ajena no se manda al optimizador: daría 400 en vez de imagen", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc123.supabase.co";
    const foreign = "https://otro-sitio.com/foto.jpg";
    assert.equal(socialImageUrl(foreign), foreign);
  });

  it("sin Supabase configurado, una dirección remota se deja como está", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    assert.equal(socialImageUrl(stored), stored);
  });
});

describe("calentar la tarjeta al publicar", () => {
  const cover = { src: "/images/vehicles/bmw-x5/01.jpg" };

  it("solo en producción: desde un entorno de pruebas apuntaría al sitio real", () => {
    assert.equal(socialImageWarmUrl(cover, {}), null);
    assert.equal(socialImageWarmUrl(cover, { VERCEL_ENV: "preview" }), null);
    assert.equal(socialImageWarmUrl(cover, { VERCEL_ENV: "development" }), null);
  });

  it("en producción pide la misma imagen que verá el rastreador", () => {
    const url = socialImageWarmUrl(cover, { VERCEL_ENV: "production" });
    assert.equal(url, socialImageUrl(cover.src));
  });

  it("sin foto, o con la imagen de relleno, no hay nada que calentar", () => {
    assert.equal(socialImageWarmUrl(undefined, { VERCEL_ENV: "production" }), null);
    assert.equal(
      socialImageWarmUrl({ src: "/images/placeholder.jpg" }, { VERCEL_ENV: "production" }),
      null,
    );
  });
});
