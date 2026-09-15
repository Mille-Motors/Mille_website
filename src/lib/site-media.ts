import { CENTER_FOCAL, type FocalPoint } from "@/lib/focal-point";
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
  /** Los marcos reales en los que se recorta. Ver `SiteMediaFrames`. */
  frames: SiteMediaFrames;
  /**
   * La superficie pública donde aparece, para saber qué invalidar al
   * cambiarla. `NOT_FOUND_SURFACE` para la página de error, que no tiene una
   * ruta que se pueda pasar a `revalidatePath`.
   */
  surface: string;
  /**
   * Una fotografía decorativa no se describe: acompaña a un texto que ya dice
   * todo lo que hay que decir, y anunciarla solo alarga el camino de quien usa
   * un lector de pantalla. Estos slots se sirven con `alt=""` y el admin no
   * ofrece editarlo.
   */
  decorative?: boolean;
  /**
   * Ancho mínimo en píxeles que debería tener el archivo para verse nítido.
   *
   * No es una cifra de gusto: es el ancho al que `object-cover` amplía la
   * fotografía en el marco de escritorio, multiplicado por 2 por las
   * pantallas Retina. Por debajo de esto el navegador está estirando píxeles
   * que no existen, y no hay ajuste de calidad que lo arregle.
   */
  recommendedWidth: number;
  legacySrc: string;
  legacyAlt: string;
}

/**
 * El marco en el que la página recorta una fotografía, para poder enseñar en
 * el admin el mismo encuadre que verá el visitante.
 *
 * `ratio` es ancho/alto. No sale de una preferencia: se calcula del layout
 * público con dos viewports de referencia, 1440 px en escritorio y 390 px en
 * teléfono, que es donde el diseño se decidió. La derivación de cada número
 * está anotada junto al slot.
 *
 * Una salvedad honesta sobre escritorio: tres de los cuatro marcos son
 * `min-h` con `aspect-auto`, así que su altura real la manda la columna de
 * texto de al lado y crece si ese texto crece. Aquí se usa la altura mínima
 * garantizada por el código, que es el recorte más exigente: un encuadre que
 * funciona con ella funciona también cuando el marco se estira.
 */
export interface SiteMediaFrame {
  label: string;
  /** Ancho / alto. */
  ratio: number;
}

export interface SiteMediaFrames {
  desktop: SiteMediaFrame;
  /**
   * Null cuando la fotografía no se muestra en pantallas pequeñas. Es el caso
   * de la 404, que oculta la imagen por debajo de `lg`: ofrecer una pestaña
   * "Teléfono" ahí sería enseñar un recorte que nadie va a ver nunca.
   */
  mobile: SiteMediaFrame | null;
}

/**
 * La página de error no es una ruta direccionable: no existe un `/_not-found`
 * que pasarle a `revalidatePath`. Se marca con esta constante para que quien
 * invalida sepa que ahí hace falta otra estrategia.
 */
export const NOT_FOUND_SURFACE = "__not-found__";

export const SITE_MEDIA_SLOTS: readonly SiteMediaSlot[] = [
  {
    key: "home.hero",
    label: "Hero de la home",
    description:
      "La fotografía grande de la portada, al lado de «Más que carros, es un estilo de vida».",
    aspect: "Horizontal. 4:3 en teléfono, 16:10 en tablet y vertical completa en escritorio.",
    frames: {
      // Container wide sin padding en lg (1440) × columna 1.08fr de 2fr =
      // 777,6 px de ancho, contra el lg:min-h-[36rem] = 576 px de alto.
      desktop: { label: "Escritorio", ratio: 1.35 },
      // aspect-[4/3] por debajo de sm.
      mobile: { label: "Teléfono", ratio: 4 / 3 },
    },
    // 1024 px de ancho efectivo en el marco de 1440 × 2 (Retina).
    surface: "/",
    recommendedWidth: 2050,
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
    frames: {
      // (1440 − 96 de padding − 64 de gap) × 1.05fr de 2.05fr = 655,6 px,
      // contra lg:min-h-[32rem] = 512 px.
      desktop: { label: "Escritorio", ratio: 1.28 },
      mobile: { label: "Teléfono", ratio: 4 / 3 },
    },
    // 910 px efectivos × 2.
    surface: "/",
    recommendedWidth: 1850,
    legacySrc: "/images/vehicles/audi-rs-5-sportback/01.jpg",
    legacyAlt: "Audi RS 5 Sportback en carretera entre árboles de otoño",
  },
  {
    key: "home.about.house",
    label: "House of Motor Culture",
    description:
      "La fotografía que va junto a la placa vinotinto del manifiesto.",
    aspect: "Vertical u horizontal amplia. En escritorio es una columna alta.",
    frames: {
      // 1440 × 1.05fr de 2fr = 756 px, contra lg:min-h-[38rem] = 608 px.
      desktop: { label: "Escritorio", ratio: 1.24 },
      // El único sin aspect-ratio: 390 − 40 de padding = 350 px de ancho
      // contra min-h-[22rem] = 352 px. Prácticamente un cuadrado, y por eso
      // es el marco que más castiga un encuadre pensado solo para ancho.
      mobile: { label: "Teléfono", ratio: 0.99 },
    },
    // 1081 px efectivos × 2; es el marco más exigente.
    surface: "/",
    recommendedWidth: 2200,
    legacySrc: "/images/vehicles/bmw-m4-competition/01.jpg",
    legacyAlt:
      "BMW M4 Competition en verde Isle of Man en una calle de la ciudad",
  },
  {
    key: "home.about.future",
    label: "Capítulo 06 — Hacia dónde queremos ir",
    description: "Cierra la historia, junto a la lista de Drive, Track, Meet…",
    aspect: "Horizontal 4:3. En escritorio ocupa toda la altura del capítulo.",
    frames: {
      // (1440 − 96 − 64) × 1fr de 2.05fr = 624,4 px, contra
      // lg:min-h-[32rem] = 512 px.
      desktop: { label: "Escritorio", ratio: 1.22 },
      mobile: { label: "Teléfono", ratio: 4 / 3 },
    },
    // 910 px efectivos × 2.
    surface: "/",
    recommendedWidth: 1850,
    legacySrc: "/images/vehicles/bmw-r-1250-gs-adventure/01.jpg",
    legacyAlt:
      "Motociclista en una BMW R 1250 GS Adventure en una carretera de montaña",
  },
  {
    key: "contact.hero",
    label: "Contacto",
    description: "La fotografía principal de la página de contacto.",
    aspect: "Horizontal. 4:3 en teléfono, 16:9 en tablet y columna alta en escritorio.",
    frames: {
      // Container wide sin padding en lg (1440) × columna 1fr de 2fr = 720 px
      // de ancho, contra el lg:min-h-[34rem] = 544 px de alto.
      desktop: { label: "Escritorio", ratio: 1.32 },
      // aspect-[4/3] por debajo de sm.
      mobile: { label: "Teléfono", ratio: 4 / 3 },
    },
    // 967 px de ancho efectivo en el marco de escritorio × 2 (Retina).
    surface: "/contacto",
    recommendedWidth: 1950,
    legacySrc: "/images/brand/night.jpg",
    legacyAlt: "Vehículo de MILLE fotografiado de noche",
  },
  {
    key: "error.404",
    label: "Error 404",
    description: "La fotografía que acompaña la página de error 404.",
    aspect: "Horizontal 4:3. Solo se muestra en escritorio.",
    frames: {
      // Container wide con lg:px-12 (1344) menos el gap-10 (40) = 1304,
      // repartido 1fr / 0.85fr → 599 px de ancho, y aspect-[4/3] de alto.
      desktop: { label: "Escritorio", ratio: 4 / 3 },
      // `hidden lg:block`: por debajo de 1024 px la fotografía no se pinta.
      mobile: null,
    },
    surface: NOT_FOUND_SURFACE,
    // 798 px de ancho efectivo × 2 (Retina).
    recommendedWidth: 1600,
    legacySrc: "/images/brand/night.jpg",
    // Acompaña al 404 y no aporta información: se sirve con alt vacío.
    decorative: true,
    legacyAlt: "Vehículo de MILLE fotografiado de noche",
  },
] as const;

/** Las superficies públicas que muestran alguna de estas fotografías. */
export function siteMediaSurfaces(): string[] {
  return [...new Set(SITE_MEDIA_SLOTS.map((slot) => slot.surface))];
}

/**
 * Qué hay que invalidar para que un cambio se vea en todas partes.
 *
 * Con una sola superficie bastaría su ruta. En cuanto hay varias —o una que
 * no tiene ruta, como la 404— sale más barato y más seguro invalidar el
 * layout raíz: cubre todo lo que cuelga de él, que es exactamente el conjunto
 * de páginas que pueden mostrar estas imágenes.
 */
export function siteMediaRevalidationTarget(): {
  path: string;
  type?: "page" | "layout";
} {
  const surfaces = siteMediaSurfaces();
  if (surfaces.length === 1 && surfaces[0] !== NOT_FOUND_SURFACE) {
    return { path: surfaces[0] };
  }
  return { path: "/", type: "layout" };
}

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
  focal: FocalPoint;
}

/** El valor de respaldo de un slot, tal como el sitio se construyó. */
export function legacyImage(slot: SiteMediaSlot): SiteMediaImage {
  return {
    src: slot.legacySrc,
    alt: slot.legacyAlt,
    source: "legacy",
    // El sitio se construyó con las cuatro centradas; el respaldo tiene que
    // verse igual que antes de que existiera el encuadre.
    focal: { ...CENTER_FOCAL },
  };
}
