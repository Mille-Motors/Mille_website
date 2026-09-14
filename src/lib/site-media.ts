import type { SiteMediaSource } from "@/types/site-media";

/**
 * Los cuatro slots visuales estructurales del sitio público.
 *
 * La lista no se inventa aquí: viene de docs/FRONTEND_VISUAL_TODO.md, donde
 * quedó anotada como requisito pendiente "cuando exista backend". Son las
 * cuatro fotografías de la home que no pertenecen a ningún vehículo del
 * inventario, sino a la identidad del sitio.
 *
 * No es un CMS. Las claves son fijas y viven en el código: el admin puede
 * cambiar la fotografía de un slot, no crear slots nuevos ni renombrarlos.
 * Una clave que no esté aquí no se puede administrar, y eso es intencional.
 *
 * `legacySrc` es la imagen con la que el sitio se construyó, y sigue siendo
 * la red de seguridad: si falta la fila o la base no responde, el slot cae a
 * ella. Aquí sí es correcto —el archivo es parte del código del sitio— al
 * contrario que con el inventario, donde inventar vehículos escondería una
 * caída de producción.
 */
export interface SiteMediaSlot {
  key: string;
  label: string;
  /** Dónde se ve, en lenguaje de quien administra. */
  description: string;
  /** Proporción que ocupa en la página, para orientar el recorte. */
  aspect: string;
  legacySrc: string;
  legacyAlt: string;
}

export const SITE_MEDIA_SLOTS: readonly SiteMediaSlot[] = [
  {
    key: "home.hero",
    label: "Hero de la home",
    description:
      "La fotografía grande de la portada, al lado de «Más que carros, es un estilo de vida».",
    aspect: "Horizontal. 4:3 en teléfono, 16:10 en tablet y vertical completa en escritorio.",
    legacySrc: "/images/brand/hero.jpg",
    legacyAlt:
      "BMW M3 con la identidad de MILLE frente a los cerros de Bogotá",
  },
  {
    key: "home.about.origin",
    label: "Capítulo 01 — Por qué estamos aquí",
    description:
      "Acompaña el capítulo donde David y Nicolás cuentan cómo empezó MILLE.",
    aspect: "Horizontal 4:3. En escritorio ocupa toda la altura del capítulo.",
    legacySrc: "/images/vehicles/audi-rs-5-sportback/01.jpg",
    legacyAlt: "Audi RS 5 Sportback en carretera entre árboles de otoño",
  },
  {
    key: "home.about.house",
    label: "House of Motor Culture",
    description:
      "La fotografía que va junto a la placa vinotinto del manifiesto.",
    aspect: "Vertical u horizontal amplia. En escritorio es una columna alta.",
    legacySrc: "/images/vehicles/bmw-m4-competition/01.jpg",
    legacyAlt:
      "BMW M4 Competition en verde Isle of Man en una calle de la ciudad",
  },
  {
    key: "home.about.future",
    label: "Capítulo 06 — Hacia dónde queremos ir",
    description: "Cierra la historia, junto a la lista de Drive, Track, Meet…",
    aspect: "Horizontal 4:3. En escritorio ocupa toda la altura del capítulo.",
    legacySrc: "/images/vehicles/bmw-r-1250-gs-adventure/01.jpg",
    legacyAlt:
      "Motociclista en una BMW R 1250 GS Adventure en una carretera de montaña",
  },
] as const;

export type SiteMediaKey = (typeof SITE_MEDIA_SLOTS)[number]["key"];

const byKey = new Map(SITE_MEDIA_SLOTS.map((slot) => [slot.key, slot]));

export function getSlot(key: string): SiteMediaSlot | undefined {
  return byKey.get(key);
}

export function isKnownSlot(key: string): boolean {
  return byKey.has(key);
}

/** Lo que el frontend necesita para pintar un slot. */
export interface SiteMediaImage {
  src: string;
  alt: string;
  source: SiteMediaSource;
}

/** El valor de respaldo de un slot, tal como el sitio se construyó. */
export function legacyImage(slot: SiteMediaSlot): SiteMediaImage {
  return { src: slot.legacySrc, alt: slot.legacyAlt, source: "legacy" };
}
