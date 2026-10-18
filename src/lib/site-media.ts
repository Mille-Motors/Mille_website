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
    label: "Portada de la home",
    description:
      "La fotografía a pantalla completa que abre la home, detrás de «Nos mueve.».",
    aspect:
      "Horizontal y grande. Ocupa toda la pantalla: apaisada en escritorio y casi vertical en teléfono, así que conviene que el vehículo esté cerca del centro.",
    frames: {
      // 100svh de alto con la barra transparente por encima: 1440 × 900 en
      // un portátil, que es 1,6.
      desktop: { label: "Escritorio", ratio: 1.6 },
      // En teléfono llena la pantalla: 390 × ~700 una vez descontada la barra
      // de direcciones del navegador.
      mobile: { label: "Teléfono", ratio: 0.56 },
    },
    // Ancho de la pantalla × 2 (Retina): 1440 × 2 = 2880, y por encima de
    // 2400 px la mejora ya no se nota en un recorte a pantalla completa.
    surface: "/",
    recommendedWidth: 2400,
    legacySrc: "/images/brand/hero.jpg",
    legacyAlt:
      "BMW M3 con la identidad de MILLE frente a los cerros de Bogotá",
  },
  {
    key: "home.featured.a",
    label: "Destacados: primera fotografía",
    description:
      "La fotografía grande de la izquierda en «Nos hacen mirar dos veces». Solo se ve mientras no haya dos vehículos destacados en el inventario; cuando los hay, la sección enseña esos vehículos.",
    aspect: "Horizontal 4:3, igual en escritorio y en teléfono.",
    frames: {
      // Columna de 1.2fr de 2.2fr dentro del ancho de página, con aspect-[4/3].
      desktop: { label: "Escritorio", ratio: 4 / 3 },
      mobile: { label: "Teléfono", ratio: 4 / 3 },
    },
    // ≈ 630 px de ancho en escritorio × 2.
    surface: "/",
    recommendedWidth: 1300,
    legacySrc: "/images/vehicles/bmw-m4-competition/01.jpg",
    legacyAlt: "BMW M4 Competition verde frente a un edificio de ladrillo",
  },
  {
    key: "home.featured.b",
    label: "Destacados: segunda fotografía",
    description:
      "La fotografía de la derecha, más baja, en «Nos hacen mirar dos veces». Misma regla que la primera.",
    aspect: "Horizontal 4:3, igual en escritorio y en teléfono.",
    frames: {
      // Columna de 1fr de 2.2fr dentro del ancho de página, con aspect-[4/3].
      desktop: { label: "Escritorio", ratio: 4 / 3 },
      mobile: { label: "Teléfono", ratio: 4 / 3 },
    },
    // ≈ 525 px de ancho en escritorio × 2.
    surface: "/",
    recommendedWidth: 1200,
    legacySrc: "/images/vehicles/audi-rs-5-sportback/02.jpg",
    legacyAlt: "Audi RS 5 Sportback gris junto a un edificio moderno",
  },
  {
    key: "home.about.origin",
    label: "Historia: «Nos pasa desde siempre»",
    description:
      "Acompaña el texto donde David y Nicolás cuentan cómo empezó MILLE.",
    aspect: "Horizontal 5:4, igual en escritorio y en teléfono.",
    frames: {
      // Columna de 1.15fr de 2fr dentro del ancho de página (1440 menos los
      // márgenes de 8vw), con aspect-[5/4]: el marco no cambia con el texto.
      desktop: { label: "Escritorio", ratio: 1.25 },
      mobile: { label: "Teléfono", ratio: 1.25 },
    },
    // ≈ 615 px de ancho en escritorio × 2.
    surface: "/",
    recommendedWidth: 1400,
    legacySrc: "/images/vehicles/porsche-macan/02.jpg",
    legacyAlt:
      "Porsche Cayenne gris sobre un empedrado de piedra, frente a un muro claro",
  },
  {
    key: "home.about.house",
    label: "Vende con MILLE",
    description:
      "La fotografía a todo el ancho de «Tu carro merece una buena presentación», con el texto encima, a la izquierda.",
    aspect:
      "Muy apaisada en escritorio y más cuadrada en teléfono. El texto va sobre la mitad izquierda: deja ahí un fondo tranquilo.",
    frames: {
      // 1440 de ancho contra min-h = clamp(32rem, 82svh, 58rem): 738 px de
      // alto en una pantalla de 900.
      desktop: { label: "Escritorio", ratio: 1.95 },
      // 390 de ancho contra 32rem = 512 px de alto, que es el mínimo.
      mobile: { label: "Teléfono", ratio: 0.76 },
    },
    // Ancho completo × 2, igual que la portada.
    surface: "/",
    recommendedWidth: 2400,
    legacySrc: "/images/vehicles/jeep-grand-cherokee-limited/01.jpg",
    legacyAlt:
      "Jeep Grand Cherokee gris en un valle de montaña con nieve",
  },
  {
    key: "home.about.future",
    label: "Cultura: «Fuera del garaje»",
    description:
      "Junto a «El plan es encontrarnos», en la sección de rutas y encuentros.",
    aspect: "Vertical 4:5, igual en escritorio y en teléfono.",
    frames: {
      // Columna de 0.8fr con tope de 35rem (560 px) y aspect-[4/5].
      desktop: { label: "Escritorio", ratio: 0.8 },
      mobile: { label: "Teléfono", ratio: 0.8 },
    },
    // 560 px de ancho × 2.
    surface: "/",
    recommendedWidth: 1200,
    legacySrc: "/images/vehicles/bmw-r-1250-gs-adventure/01.jpg",
    legacyAlt:
      "Motociclista en una BMW R 1250 GS Adventure en una carretera de montaña",
  },
  {
    key: "contact.hero",
    label: "Contacto",
    description: "La fotografía principal de la página de contacto.",
    aspect: "Horizontal 4:3, igual en escritorio y en teléfono.",
    frames: {
      // Columna de 0.9fr de 1.9fr dentro del ancho de página (1440 menos los
      // márgenes de 8vw y el hueco), con aspect-[4/3]: el marco no cambia con
      // el texto de al lado.
      desktop: { label: "Escritorio", ratio: 4 / 3 },
      mobile: { label: "Teléfono", ratio: 4 / 3 },
    },
    // ≈ 520 px de ancho en escritorio × 2.
    surface: "/contacto",
    recommendedWidth: 1200,
    legacySrc: "/images/brand/night.jpg",
    legacyAlt: "Vehículo de MILLE fotografiado de noche",
  },
  {
    key: "error.404",
    label: "Error 404",
    description: "La fotografía que acompaña la página de error 404.",
    aspect: "Horizontal 4:3. Solo se muestra en escritorio.",
    frames: {
      // Ancho de página (1440 menos los márgenes de 8vw) repartido 1fr / 0.85fr
      // → ≈ 510 px de ancho, y aspect-[4/3] de alto.
      desktop: { label: "Escritorio", ratio: 4 / 3 },
      // `hidden lg:block`: por debajo de 1024 px la fotografía no se pinta.
      mobile: null,
    },
    surface: NOT_FOUND_SURFACE,
    // ≈ 510 px de ancho efectivo × 2 (Retina).
    recommendedWidth: 1200,
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
