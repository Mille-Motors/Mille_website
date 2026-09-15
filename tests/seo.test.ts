import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import robots from "@/app/robots";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  NOINDEX_ROBOTS,
  PUBLIC_ROBOTS,
  SITE_DESCRIPTION,
  SITE_ORIGIN,
  absoluteImageUrl,
  absoluteUrl,
  breadcrumbJsonLd,
  buildSitemap,
  canonical,
  organizationJsonLd,
  socialMetadata,
  vehicleJsonLd,
  vehicleMetaDescription,
  vehicleMetaTitle,
  websiteJsonLd,
} from "@/lib/seo";
import type { Vehicle } from "@/types/vehicle";

/**
 * Lo que un buscador ve de MILLE.
 *
 * No se prueba que Next escriba bien una etiqueta —eso es del framework—,
 * sino lo que sí es una decisión nuestra y se puede romper sin que nadie se
 * entere: el dominio canónico, qué se indexa, qué no, y qué datos se declaran
 * como ciertos.
 */

const CANONICAL = "https://millemotorculture.com";

const vehicle: Vehicle = {
  id: "1",
  slug: "bmw-x5-xdrive40i",
  make: "BMW",
  model: "X5",
  version: "xDrive40i",
  year: 2020,
  price: 289_900_000,
  mileage: 45_000,
  vehicleType: "auto",
  category: {
    id: "c1", name: "SUV", pluralName: "SUV", slug: "suv",
    vehicleType: "auto", active: true, position: 0,
  },
  fuelType: "Gasolina",
  transmission: "Automática",
  drivetrain: "4x4 (AWD)",
  engine: "3.0 L turbo",
  power: "340 hp",
  exteriorColor: "Gris",
  interiorColor: "Negro",
  city: "Bogotá, CO",
  availability: "available",
  publication: "published",
  featured: false,
  description: "Un X5 de un solo dueño, con mantenimientos al día.",
  equipment: ["Techo panorámico"],
  images: [
    { id: "i1", src: "/images/vehicles/bmw-x5-xdrive40i/01.jpg", alt: "BMW X5", source: "legacy", storagePath: null },
    { id: "i2", src: "https://cdn.supabase.co/storage/v1/object/public/vehicles/1/02.jpg", alt: "", source: "storage", storagePath: "vehicles/1/02.jpg" },
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z",
  publishedAt: "2026-01-15T00:00:00.000Z",
};

describe("dominio canónico", () => {
  it("la autoridad es millemotorculture.com, sin www y sin barra final", () => {
    assert.equal(SITE_ORIGIN, CANONICAL);
  });

  it("la home canonicaliza a la raíz con barra", () => {
    assert.equal(absoluteUrl("/"), `${CANONICAL}/`);
  });

  it("las demás páginas públicas canonicalizan a su ruta", () => {
    assert.deepEqual(canonical("/vehiculos"), {
      canonical: `${CANONICAL}/vehiculos`,
    });
    assert.deepEqual(canonical("/contacto"), {
      canonical: `${CANONICAL}/contacto`,
    });
    assert.deepEqual(canonical("/vehiculos/bmw-x5-xdrive40i"), {
      canonical: `${CANONICAL}/vehiculos/bmw-x5-xdrive40i`,
    });
  });

  it("ninguna URL pública apunta al despliegue de Vercel", () => {
    const urls = JSON.stringify([
      buildSitemap([{ slug: vehicle.slug, updatedAt: vehicle.updatedAt }]),
      robots(),
      organizationJsonLd(),
      websiteJsonLd(),
      vehicleJsonLd(vehicle),
      socialMetadata({ title: "t", description: "d", path: "/" }),
    ]);
    assert.ok(!urls.includes("vercel.app"));
  });

  it("una foto de Storage ya es absoluta y no se reescribe", () => {
    assert.equal(
      absoluteImageUrl("https://cdn.supabase.co/x.jpg"),
      "https://cdn.supabase.co/x.jpg",
    );
    assert.equal(absoluteImageUrl("/a.jpg"), `${CANONICAL}/a.jpg`);
  });
});

describe("robots", () => {
  it("el sitio público se rastrea entero", () => {
    const rules = robots().rules;
    assert.ok(!Array.isArray(rules));
    assert.equal(rules.userAgent, "*");
    assert.equal(rules.allow, "/");
  });

  it("el admin y la API quedan fuera", () => {
    const rules = robots().rules;
    assert.ok(!Array.isArray(rules));
    assert.deepEqual(rules.disallow, ["/admin", "/api"]);
  });

  it("anuncia el sitemap en el dominio oficial", () => {
    assert.equal(robots().sitemap, `${CANONICAL}/sitemap.xml`);
  });

  it("el sitio público ya no lleva noindex global", () => {
    const publicRobots = PUBLIC_ROBOTS as { index: boolean; follow: boolean };
    assert.equal(publicRobots.index, true);
    assert.equal(publicRobots.follow, true);
    assert.equal((NOINDEX_ROBOTS as { index: boolean }).index, false);
  });

  /**
   * Fija el cambio en el archivo y no solo en la constante: publicar de nuevo
   * el sitio entero en `noindex` es exactamente el error que esta fase vino a
   * deshacer, y el admin es lo único que debe seguir excluido.
   */
  it("el layout raíz indexa y el del admin no", () => {
    const root = readFileSync("src/app/layout.tsx", "utf8");
    assert.ok(root.includes("robots: PUBLIC_ROBOTS"));
    assert.ok(!/index:\s*false/.test(root));

    const admin = readFileSync("src/app/admin/layout.tsx", "utf8");
    assert.ok(/index:\s*false/.test(admin));
  });
});

describe("sitemap", () => {
  const entries = buildSitemap([
    { slug: "bmw-x5-xdrive40i", updatedAt: "2026-02-01T00:00:00.000Z" },
    { slug: "ducati-monster-937", updatedAt: "2026-03-01T00:00:00.000Z" },
  ]);
  const urls = entries.map((entry) => entry.url);

  it("incluye las tres páginas públicas fijas y cada vehículo publicado", () => {
    assert.deepEqual(urls, [
      `${CANONICAL}/`,
      `${CANONICAL}/vehiculos`,
      `${CANONICAL}/contacto`,
      `${CANONICAL}/vehiculos/bmw-x5-xdrive40i`,
      `${CANONICAL}/vehiculos/ducati-monster-937`,
    ]);
  });

  it("no lista el admin, la API ni combinaciones de filtros", () => {
    for (const url of urls) {
      assert.ok(url.startsWith(`${CANONICAL}/`));
      assert.ok(!url.includes("/admin"));
      assert.ok(!url.includes("/api"));
      assert.ok(!url.includes("?"));
    }
  });

  it("un inventario sin publicados deja solo las páginas fijas", () => {
    assert.equal(buildSitemap([]).length, 3);
  });

  it("la home y el inventario datan del vehículo más reciente", () => {
    assert.equal(entries[0].lastModified, "2026-03-01T00:00:00.000Z");
    assert.equal(entries[1].lastModified, "2026-03-01T00:00:00.000Z");
    assert.equal(entries[2].lastModified, undefined);
    assert.equal(entries[3].lastModified, "2026-02-01T00:00:00.000Z");
  });
});

describe("metadata de una ficha de vehículo", () => {
  it("el título es marca, modelo, versión y año", () => {
    assert.equal(vehicleMetaTitle(vehicle), "BMW X5 xDrive40i 2020");
  });

  it("la descripción sale de datos reales y cabe en un resultado", () => {
    const description = vehicleMetaDescription(vehicle);
    assert.ok(description.startsWith("BMW X5 xDrive40i 2020."));
    assert.match(description, /Disponible en MILLE, Bogotá/);
    assert.match(description, /45\.000 km/);
    assert.ok(description.length <= 160);
  });

  it("un vehículo vendido no se anuncia como disponible", () => {
    const sold = vehicleMetaDescription({ ...vehicle, availability: "sold" });
    assert.match(sold, /Vendido en MILLE/);
    assert.ok(!sold.includes("Disponible"));
  });

  it("el Open Graph lleva siempre siteName, locale y la URL canónica", () => {
    const social = socialMetadata({
      title: "BMW X5 xDrive40i 2020 | MILLE",
      description: "…",
      path: "/vehiculos/bmw-x5-xdrive40i",
    });
    assert.equal(social.openGraph?.siteName, "MILLE");
    assert.equal(social.openGraph?.locale, "es_CO");
    assert.equal(
      social.openGraph?.url,
      `${CANONICAL}/vehiculos/bmw-x5-xdrive40i`,
    );
  });

  it("la imagen social por defecto es absoluta", () => {
    const images = socialMetadata({ title: "t", description: "d", path: "/" })
      .openGraph?.images as { url: string }[];
    assert.ok(images[0].url.startsWith(`${CANONICAL}/`));
  });
});

describe("datos estructurados", () => {
  it("Organization declara la marca y su logo, y nada inventado", () => {
    const org = organizationJsonLd();
    assert.equal(org["@context"], "https://schema.org");
    assert.equal(org["@type"], "Organization");
    assert.equal(org.name, "MILLE");
    assert.equal(org.alternateName, "MILLE Motor Culture");
    assert.equal(org.url, `${CANONICAL}/`);
    assert.equal(org.logo, `${CANONICAL}/brand/shield.png`);
    for (const invented of ["telephone", "address", "email", "foundingDate", "aggregateRating"]) {
      assert.ok(!(invented in org), `no debería declarar ${invented}`);
    }
  });

  it("WebSite no promete una búsqueda que no existe", () => {
    const website = websiteJsonLd();
    assert.equal(website["@type"], "WebSite");
    assert.equal(website.url, `${CANONICAL}/`);
    assert.ok(!("potentialAction" in website));
  });

  it("un carro es Car y una moto es Motorcycle", () => {
    assert.equal(vehicleJsonLd(vehicle)["@type"], "Car");
    assert.equal(
      vehicleJsonLd({ ...vehicle, vehicleType: "moto" })["@type"],
      "Motorcycle",
    );
  });

  it("la oferta usa el precio real en pesos y la disponibilidad correcta", () => {
    const offer = vehicleJsonLd(vehicle).offers as Record<string, unknown>;
    assert.equal(offer.price, 289_900_000);
    assert.equal(offer.priceCurrency, "COP");
    assert.equal(offer.availability, "https://schema.org/InStock");
    assert.equal(
      (vehicleJsonLd({ ...vehicle, availability: "sold" }).offers as Record<string, unknown>).availability,
      "https://schema.org/SoldOut",
    );
  });

  it("las fotos del vehículo son URLs absolutas", () => {
    const images = vehicleJsonLd(vehicle).image as string[];
    assert.equal(images[0], `${CANONICAL}/images/vehicles/bmw-x5-xdrive40i/01.jpg`);
    assert.equal(images[1], "https://cdn.supabase.co/storage/v1/object/public/vehicles/1/02.jpg");
  });

  it("no se declara lo que el inventario no guarda", () => {
    const data = vehicleJsonLd(vehicle);
    assert.ok(!("itemCondition" in data));
    assert.ok(!("enginePower" in data));
  });

  it("un campo vacío no se declara vacío: se omite", () => {
    const data = vehicleJsonLd({ ...vehicle, engine: "", exteriorColor: "" });
    assert.ok(!("vehicleEngine" in data));
    assert.ok(!("color" in data));
  });

  it("la ruta estructurada es la misma que se ve en la ficha", () => {
    const crumbs = breadcrumbJsonLd([
      { name: "Inicio", path: "/" },
      { name: "Vehículos", path: "/vehiculos" },
    ]).itemListElement as Record<string, unknown>[];
    assert.equal(crumbs[0].position, 1);
    assert.equal(crumbs[0].item, `${CANONICAL}/`);
    assert.equal(crumbs[1].position, 2);
    assert.equal(crumbs[1].item, `${CANONICAL}/vehiculos`);
  });

  it("todo el JSON-LD es serializable y vuelve a leerse igual", () => {
    for (const data of [organizationJsonLd(), websiteJsonLd(), vehicleJsonLd(vehicle)]) {
      const serialized = JSON.stringify(data);
      assert.deepEqual(JSON.parse(serialized), data);
      assert.ok(typeof (JSON.parse(serialized) as { "@type": string })["@type"] === "string");
    }
  });

  /**
   * La descripción de un vehículo la escribe una persona en el admin. Si
   * alguna vez contiene `</script>`, sin escapar cerraría la etiqueta y lo
   * que siguiera se convertiría en HTML de la página.
   */
  it("un texto del inventario no puede cerrar la etiqueta y escribir HTML", () => {
    const html = renderToStaticMarkup(
      createElement(JsonLd, {
        data: vehicleJsonLd({
          ...vehicle,
          description: '</script><img src=x onerror="alert(1)">',
        }),
      }),
    );
    assert.ok(!html.includes("</script><img"));
    assert.ok(html.includes("\\u003c/script>"));
    assert.equal(html.match(/<\/script>/g)?.length, 1);
  });

  it("la descripción global es la que se publica y menciona la marca", () => {
    assert.match(SITE_DESCRIPTION, /House of Motor Culture/);
    assert.match(SITE_DESCRIPTION, /Bogotá/);
    assert.ok(SITE_DESCRIPTION.length <= 160);
  });
});
