import type { Metadata, MetadataRoute } from "next";

import { site } from "@/data/site";
import { formatMileage, vehicleTitle } from "@/lib/format";
import type { AvailabilityStatus, Vehicle } from "@/types/vehicle";

/**
 * La autoridad canónica del sitio, en un solo archivo.
 *
 * Todo lo que un buscador lee —canonical, Open Graph, robots, sitemap,
 * JSON-LD— se construye aquí a partir de `site.url`. Ninguna URL pública se
 * escribe a mano en una página: si mañana cambia el dominio, cambia
 * `src/data/site.ts` y nada más. Por eso tampoco aparece por ningún lado la
 * URL de despliegue de Vercel: sigue funcionando, pero no es autoridad.
 *
 * El módulo es puro a propósito —no toca la base, no importa `server-only`—
 * para que las pruebas puedan comprobar canonicals, sitemap y datos
 * estructurados sin levantar PostgreSQL.
 */

/** Sin barra final: es un prefijo, no una URL. */
export const SITE_ORIGIN = site.url.replace(/\/+$/, "");

export function absoluteUrl(path = "/"): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_ORIGIN}${suffix}`;
}

/** Deja intactas las fotos que ya viven en Supabase Storage. */
export function absoluteImageUrl(src: string): string {
  return /^https?:\/\//.test(src) ? src : absoluteUrl(src);
}

export const SITE_TITLE = `${site.name} | Motor Culture`;

/**
 * La descripción global. Es la versión corta de la aprobada: Google recorta
 * el fragmento alrededor de los 160 caracteres, y lo que se cortaba era
 * justamente el cierre. Dice lo mismo —House of Motor Culture, Bogotá,
 * carros y motos, cultura automotriz— dentro de lo que se llega a leer.
 */
export const SITE_DESCRIPTION =
  "MILLE es una House of Motor Culture en Bogotá. Carros y motos seleccionados, cultura automotriz y una experiencia construida alrededor de las máquinas.";

/**
 * La imagen que acompaña a cada enlace compartido. Es una fotografía que ya
 * está en el repositorio —la misma del hero de contacto y de la 404—, no una
 * generada para esto: apaisada, 1800 px de ancho, que es lo que piden las
 * previsualizaciones. Las fichas de vehículo la sustituyen por su foto real.
 */
export const OG_IMAGE = {
  url: absoluteUrl("/images/brand/night.jpg"),
  width: 1800,
  height: 1200,
  alt: `${site.name} — ${site.tagline}`,
} as const;

/** El logo oficial, el mismo que pinta la barra de navegación. */
export const LOGO_URL = absoluteUrl("/brand/shield.png");

/**
 * Lo que el sitio público le dice a los buscadores desde el lanzamiento.
 * Vive aquí, y no suelto en el layout, para que una prueba pueda fijarlo:
 * volver a publicar el sitio entero en `noindex` tiene que costar trabajo.
 */
export const PUBLIC_ROBOTS: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

/**
 * Para lo que es una página de verdad pero no es contenido: la 404 y la
 * ficha de un slug que no existe. No se indexa, pero sí se siguen sus
 * enlaces, que son la salida hacia el inventario real.
 */
export const NOINDEX_ROBOTS: Metadata["robots"] = { index: false, follow: true };

export function canonical(path: string): Metadata["alternates"] {
  return { canonical: absoluteUrl(path) };
}

interface SocialInput {
  title: string;
  description: string;
  /** Ruta canónica de la página. */
  path: string;
  images?: { url: string; width?: number; height?: number; alt?: string }[];
}

/**
 * Open Graph y Twitter de una página pública.
 *
 * Next **reemplaza** los objetos anidados como `openGraph` en el segmento más
 * profundo que los define: una página que solo escribe título e imagen se
 * queda sin `siteName`, sin `locale` y sin `type`. Por eso cada página pública
 * pasa por aquí en vez de escribir su propio objeto a medias.
 */
export function socialMetadata({
  title,
  description,
  path,
  images = [OG_IMAGE],
}: SocialInput): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      locale: "es_CO",
      siteName: site.name,
      title,
      description,
      url: absoluteUrl(path),
      images,
    },
    // Sin `site` ni `creator`: MILLE no tiene cuenta de X, y un handle
    // inventado es peor que no tener tarjeta.
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((image) => image.url),
    },
  };
}

export function vehiclePath(slug: string): string {
  return `/vehiculos/${slug}`;
}

/** "BMW X5 xDrive40i 2020". Sin repetir la marca ni añadir adornos. */
export function vehicleMetaTitle(vehicle: Vehicle): string {
  return `${vehicleTitle(vehicle)} ${vehicle.year}`;
}

const availabilityWord: Record<AvailabilityStatus, string> = {
  available: "Disponible",
  reserved: "Reservado",
  sold: "Vendido",
};

/**
 * La descripción de una ficha se arma con datos reales del vehículo, no con
 * su texto editorial recortado a ciegas: así empieza por lo que alguien
 * escribiría en el buscador y no se parte a mitad de una frase.
 */
export function vehicleMetaDescription(vehicle: Vehicle): string {
  const specs = [
    formatMileage(vehicle.mileage),
    vehicle.fuelType,
    vehicle.transmission,
  ]
    .filter((value) => value?.trim())
    .join(" · ");

  const parts = [
    `${vehicleMetaTitle(vehicle)}. ${availabilityWord[vehicle.availability]} en ${site.name}, ${site.city}.`,
  ];
  if (specs) parts.push(`${specs}.`);
  parts.push("Consulta especificaciones, equipamiento y fotografías.");

  return clamp(parts.join(" "));
}

/** Recorta por palabra, no por carácter. */
function clamp(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  const trimmed = space > max * 0.6 ? cut.slice(0, space) : cut;
  return `${trimmed.replace(/[\s.,;:·—-]+$/, "")}…`;
}

/* ------------------------------------------------------------------ */
/* Datos estructurados                                                 */
/* ------------------------------------------------------------------ */

export type JsonLd = Record<string, unknown>;

/** Quita las claves vacías: un dato que no tenemos no se declara. */
function compact(value: JsonLd): JsonLd {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) => item !== undefined && item !== null && item !== "",
    ),
  );
}

const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
const WEBSITE_ID = `${SITE_ORIGIN}/#website`;

/**
 * Quién es MILLE.
 *
 * Solo lo confirmado. No hay `telephone`, ni `address`, ni `email`, ni
 * `foundingDate`: `src/data/site.ts` los tiene en `null` porque todavía no
 * existen, y declararle a Google un dato que el sitio no muestra es
 * inventarlo. `sameAs` solo aparece cuando hay una red oficial de verdad
 * —hoy, la cuenta de Instagram que ya enlaza el pie de página—.
 */
export function organizationJsonLd(): JsonLd {
  return compact({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: site.name,
    alternateName: `${site.name} Motor Culture`,
    description: SITE_DESCRIPTION,
    url: absoluteUrl("/"),
    logo: LOGO_URL,
    image: OG_IMAGE.url,
    sameAs: site.instagram ? [site.instagram.url] : undefined,
  });
}

/**
 * Sin `SearchAction`: el inventario filtra, pero no hay una búsqueda pública
 * por texto a la que se pueda mandar una consulta, y declarar una que no
 * existe es prometerle a Google una URL que no responde.
 */
export function websiteJsonLd(): JsonLd {
  return compact({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: site.name,
    alternateName: `${site.name} Motor Culture`,
    url: absoluteUrl("/"),
    inLanguage: "es-CO",
    publisher: { "@id": ORGANIZATION_ID },
  });
}

/**
 * Un vehículo reservado no está vendido, pero tampoco se puede comprar:
 * `LimitedAvailability` es lo más cercano y honesto que ofrece schema.org.
 */
const offerAvailability: Record<AvailabilityStatus, string> = {
  available: "https://schema.org/InStock",
  reserved: "https://schema.org/LimitedAvailability",
  sold: "https://schema.org/SoldOut",
};

/**
 * La ficha de un vehículo publicado.
 *
 * `Car` y `Motorcycle` son tipos estables de schema.org y describen
 * exactamente lo que hay: el inventario distingue los dos universos desde el
 * modelo de dominio, así que no hay que forzar nada.
 *
 * Lo que no se declara: `itemCondition` —el inventario no guarda si el
 * vehículo es nuevo o usado, y deducirlo del kilometraje sería inventarlo— y
 * `enginePower`, porque `power` es texto libre ("340 hp") y schema.org espera
 * una magnitud con unidad.
 */
export function vehicleJsonLd(vehicle: Vehicle): JsonLd {
  const url = absoluteUrl(vehiclePath(vehicle.slug));

  return compact({
    "@context": "https://schema.org",
    "@type": vehicle.vehicleType === "moto" ? "Motorcycle" : "Car",
    name: vehicleMetaTitle(vehicle),
    description: vehicle.description,
    url,
    image: vehicle.images.map((image) => absoluteImageUrl(image.src)),
    brand: { "@type": "Brand", name: vehicle.make },
    model: vehicle.model,
    vehicleConfiguration: vehicle.version || undefined,
    vehicleModelDate: String(vehicle.year),
    mileageFromOdometer: {
      "@type": "QuantitativeValue",
      value: vehicle.mileage,
      unitCode: "KMT",
    },
    fuelType: vehicle.fuelType || undefined,
    vehicleTransmission: vehicle.transmission || undefined,
    driveWheelConfiguration: vehicle.drivetrain || undefined,
    vehicleEngine: vehicle.engine
      ? { "@type": "EngineSpecification", name: vehicle.engine }
      : undefined,
    color: vehicle.exteriorColor || undefined,
    vehicleInteriorColor: vehicle.interiorColor || undefined,
    bodyType: vehicle.category.name || undefined,
    offers: compact({
      "@type": "Offer",
      url,
      price: vehicle.price,
      priceCurrency: "COP",
      availability: offerAvailability[vehicle.availability],
      // Sin dirección: solo la ciudad que el propio registro guarda. MILLE
      // atiende con cita previa y no publica una sede, así que declarar una
      // calle sería inventarla.
      availableAtOrFrom: vehicle.city
        ? {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressLocality: vehicle.city,
              addressCountry: "CO",
            },
          }
        : undefined,
      seller: { "@id": ORGANIZATION_ID },
    }),
  });
}

/** La misma ruta que ya se ve arriba de la ficha, en datos. */
export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Sitemap                                                             */
/* ------------------------------------------------------------------ */

export interface VehicleSitemapEntry {
  slug: string;
  /** ISO 8601. */
  updatedAt: string;
}

/**
 * Las URLs públicas del sitio, y solo esas.
 *
 * Lo que queda fuera por definición: `/admin`, `/api`, los borradores, los
 * archivados y cualquier combinación de filtros —`/vehiculos?marca=BMW` no es
 * una página distinta, es la misma vista con otro recorte, y por eso su
 * canonical apunta a `/vehiculos`—.
 *
 * `lastModified` de la home y del inventario es la fecha del vehículo
 * publicado más reciente, que es literalmente lo que cambia en esas dos
 * páginas. `/contacto` no lleva ninguna: no tenemos una fecha real que dar y
 * no se inventa. Tampoco hay `changeFrequency` ni `priority`, que Google
 * ignora.
 */
export function buildSitemap(
  vehicles: VehicleSitemapEntry[],
): MetadataRoute.Sitemap {
  const latest = vehicles.reduce<string | undefined>(
    (newest, vehicle) =>
      !newest || vehicle.updatedAt > newest ? vehicle.updatedAt : newest,
    undefined,
  );
  const inventoryChanged = latest ? { lastModified: latest } : {};

  return [
    { url: absoluteUrl("/"), ...inventoryChanged },
    { url: absoluteUrl("/vehiculos"), ...inventoryChanged },
    { url: absoluteUrl("/contacto") },
    ...vehicles.map((vehicle) => ({
      url: absoluteUrl(vehiclePath(vehicle.slug)),
      lastModified: vehicle.updatedAt,
    })),
  ];
}
