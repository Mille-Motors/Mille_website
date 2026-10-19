import { CENTER_FOCAL, type FocalPoint } from "@/lib/focal-point";
import type { SiteMediaSource } from "@/types/site-media";

/**
 * Los espacios fotográficos del sitio público.
 *
 * Este archivo es la ÚNICA fuente de verdad del sistema de imágenes: de aquí
 * salen a la vez las recomendaciones del Admin, las validaciones del
 * servidor, los marcos del editor de encuadre y los `sizes` que el frontend
 * declara. Que estuvieran en dos sitios es lo que permitió que el Admin
 * pidiera 1.300 px para un hueco que ya necesitaba 2.048.
 *
 * No es un CMS. Las claves son fijas y viven en el código: el admin puede
 * cambiar la fotografía de un slot, no crear slots nuevos ni renombrarlos.
 * Una clave que no esté aquí no se puede administrar, y eso es intencional.
 *
 * `legacySrc` es la imagen con la que el sitio se construyó, y sigue siendo
 * la red de seguridad: si falta la fila o la base no responde, el slot cae a
 * ella. Aquí sí es correcto —el archivo es parte del repositorio— al
 * contrario que con el inventario, donde inventar vehículos escondería una
 * caída de producción.
 *
 * Dos slots pueden arrancar apuntando al mismo archivo de `/public` y seguir
 * siendo independientes: el respaldo es un valor inicial, no un vínculo.
 * Cambiar `nav.contact` no toca `contact.hero` aunque hoy enseñen la misma
 * fotografía.
 */

/** Ancho y alto en píxeles. */
export interface PixelSize {
  width: number;
  height: number;
}

/**
 * Un marco real del sitio: la forma en que una página recorta la fotografía
 * y qué resolución hace falta para llenarlo sin estirar nada.
 *
 * `ratio` es ancho/alto y describe la COMPOSICIÓN, no una caja rígida: el
 * contenedor puede crecer o encoger con el viewport mientras el recorte
 * mantenga esa proporción.
 *
 * `recommended` es lo que hay que buscar; `minimum`, lo que se acepta sin
 * que la fotografía se vea blanda en una pantalla Retina. Los dos salen del
 * ancho real del hueco multiplicado por 2, redondeado a algo que se pueda
 * pedir en una sesión de fotos.
 */
export interface SiteMediaFrame {
  label: string;
  /** Ancho / alto. */
  ratio: number;
  recommended: PixelSize;
  minimum: PixelSize;
}

/**
 * Los dos marcos de un slot.
 *
 * `mobile` en `null` significa que el teléfono recorta IGUAL que el
 * escritorio —la mayoría de los slots—, así que no hay segunda composición
 * que revisar ni variante que subir. Cuando existe, el teléfono tiene su
 * propia forma y conviene una fotografía pensada para ella.
 */
export interface SiteMediaFrames {
  desktop: SiteMediaFrame;
  mobile: SiteMediaFrame | null;
}

export interface SiteMediaSlot {
  key: string;
  label: string;
  /** Dónde se ve, en lenguaje de quien administra. */
  description: string;
  /** Una frase sobre la composición, para orientar la sesión de fotos. */
  aspect: string;
  frames: SiteMediaFrames;
  /**
   * El teléfono recorta tan distinto que una sola fotografía no puede
   * resolver bien las dos composiciones. El Admin lo dice en voz alta.
   */
  mobileVariantRecommended: boolean;
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
  legacySrc: string;
  legacyAlt: string;
}

/**
 * La página de error no es una ruta direccionable: no existe un `/_not-found`
 * que pasarle a `revalidatePath`. Se marca con esta constante para que quien
 * invalida sepa que ahí hace falta otra estrategia.
 */
export const NOT_FOUND_SURFACE = "__not-found__";

/**
 * El ancho a partir del cual manda la composición de escritorio.
 *
 * Es el `md` de Tailwind, que ya es el escalón del proyecto. Se define una
 * vez para que la consulta de medios del `<picture>`, el CSS del encuadre y
 * la vista previa del Admin no puedan desincronizarse. La decisión depende
 * del ESPACIO disponible y de nada más: ni del modelo del aparato, ni del
 * user agent, ni de la orientación. Un plegable que se abre cruza este
 * número y el navegador cambia de fuente solo.
 */
export const MOBILE_BREAKPOINT_PX = 768;
export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT_PX - 0.02}px)`;

/** Marcos que se repiten, para no copiar los mismos números. */
const PORTRAIT_4_5: SiteMediaFrame = {
  label: "Vertical 4:5",
  ratio: 4 / 5,
  recommended: { width: 1600, height: 2000 },
  minimum: { width: 1200, height: 1500 },
};

export const SITE_MEDIA_SLOTS: readonly SiteMediaSlot[] = [
  {
    key: "home.hero",
    label: "Home · Portada",
    description:
      "La fotografía a pantalla completa que abre la home, detrás de «Nos mueve.».",
    aspect:
      "En escritorio es muy apaisada y en teléfono casi vertical: son dos composiciones distintas, no un recorte de la misma.",
    frames: {
      desktop: {
        label: "Escritorio",
        ratio: 1.6,
        recommended: { width: 3200, height: 2000 },
        minimum: { width: 2400, height: 1500 },
      },
      mobile: {
        label: "Teléfono",
        ratio: 0.56,
        recommended: { width: 1400, height: 2500 },
        minimum: { width: 1080, height: 1920 },
      },
    },
    mobileVariantRecommended: true,
    surface: "/",
    legacySrc: "/images/brand/hero.jpg",
    legacyAlt:
      "BMW M3 con la identidad de MILLE frente a los cerros de Bogotá",
  },
  {
    key: "home.featured.a",
    label: "Home · Destacados, primera",
    description:
      "La fotografía de la izquierda en «Nos hacen mirar dos veces». Solo se ve mientras no haya dos vehículos destacados en el inventario; cuando los hay, la sección enseña esos vehículos.",
    aspect: "Horizontal 4:3, la misma composición en escritorio y en teléfono.",
    frames: {
      desktop: {
        label: "Escritorio y teléfono",
        ratio: 4 / 3,
        recommended: { width: 2048, height: 1536 },
        minimum: { width: 1600, height: 1200 },
      },
      mobile: null,
    },
    mobileVariantRecommended: false,
    surface: "/",
    legacySrc: "/images/vehicles/bmw-m4-competition/01.jpg",
    legacyAlt: "BMW M4 Competition verde frente a un edificio de ladrillo",
  },
  {
    key: "home.featured.b",
    label: "Home · Destacados, segunda",
    description:
      "La fotografía de la derecha en «Nos hacen mirar dos veces». Misma regla que la primera.",
    aspect: "Horizontal 4:3, la misma composición en escritorio y en teléfono.",
    frames: {
      desktop: {
        label: "Escritorio y teléfono",
        ratio: 4 / 3,
        recommended: { width: 2048, height: 1536 },
        minimum: { width: 1600, height: 1200 },
      },
      mobile: null,
    },
    mobileVariantRecommended: false,
    surface: "/",
    legacySrc: "/images/vehicles/audi-rs-5-sportback/02.jpg",
    legacyAlt: "Audi RS 5 Sportback gris junto a un edificio moderno",
  },
  {
    key: "home.about.origin",
    label: "Home · Historia",
    description:
      "Acompaña el texto donde David y Nicolás cuentan cómo empezó MILLE.",
    aspect: "Horizontal 5:4, la misma composición en escritorio y en teléfono.",
    frames: {
      desktop: {
        label: "Escritorio y teléfono",
        ratio: 5 / 4,
        recommended: { width: 2400, height: 1920 },
        minimum: { width: 1600, height: 1280 },
      },
      mobile: null,
    },
    mobileVariantRecommended: false,
    surface: "/",
    legacySrc: "/images/vehicles/porsche-macan/02.jpg",
    legacyAlt:
      "Porsche Cayenne gris sobre un empedrado de piedra, frente a un muro claro",
  },
  {
    key: "home.about.house",
    label: "Home · Vende con MILLE",
    description:
      "La fotografía a todo el ancho de «Tu carro merece una buena presentación», con el texto encima, a la izquierda.",
    aspect:
      "Muy apaisada en escritorio y casi cuadrada en teléfono. El texto va sobre la mitad izquierda: deja ahí un fondo tranquilo.",
    frames: {
      desktop: {
        label: "Escritorio",
        ratio: 1.95,
        recommended: { width: 3200, height: 1640 },
        minimum: { width: 2400, height: 1230 },
      },
      mobile: {
        label: "Teléfono",
        ratio: 0.76,
        recommended: { width: 1400, height: 1840 },
        minimum: { width: 1080, height: 1420 },
      },
    },
    mobileVariantRecommended: true,
    surface: "/",
    legacySrc: "/images/vehicles/jeep-grand-cherokee-limited/01.jpg",
    legacyAlt: "Jeep Grand Cherokee gris en un valle de montaña con nieve",
  },
  {
    key: "home.about.future",
    label: "Home · Cultura",
    description:
      "Junto a «El plan es encontrarnos», en la sección de rutas y encuentros.",
    aspect: "Vertical 4:5, la misma composición en escritorio y en teléfono.",
    frames: {
      desktop: {
        label: "Escritorio y teléfono",
        ratio: 4 / 5,
        recommended: { width: 1600, height: 2000 },
        minimum: { width: 1200, height: 1500 },
      },
      mobile: null,
    },
    mobileVariantRecommended: false,
    surface: "/",
    legacySrc: "/images/vehicles/bmw-r-1250-gs-adventure/01.jpg",
    legacyAlt:
      "Motociclista en una BMW R 1250 GS Adventure en una carretera de montaña",
  },
  {
    key: "contact.hero",
    label: "Contacto · Portada",
    description: "La fotografía principal de la página de contacto.",
    aspect: "Horizontal 4:3, la misma composición en escritorio y en teléfono.",
    frames: {
      desktop: {
        label: "Escritorio y teléfono",
        ratio: 4 / 3,
        recommended: { width: 2400, height: 1800 },
        minimum: { width: 1600, height: 1200 },
      },
      mobile: null,
    },
    mobileVariantRecommended: false,
    surface: "/contacto",
    legacySrc: "/images/brand/night.jpg",
    legacyAlt: "Vehículo de MILLE fotografiado de noche",
  },
  {
    key: "error.404",
    label: "Error 404",
    description:
      "La fotografía que acompaña la página de error. Normalmente no hay que tocarla.",
    aspect: "Horizontal 4:3. Solo se muestra en escritorio.",
    frames: {
      desktop: {
        label: "Escritorio",
        ratio: 4 / 3,
        recommended: { width: 2400, height: 1800 },
        minimum: { width: 1600, height: 1200 },
      },
      // Por debajo de `lg` la fotografía no se pinta: no hay composición de
      // teléfono que revisar ni variante que subir.
      mobile: null,
    },
    mobileVariantRecommended: false,
    surface: NOT_FOUND_SURFACE,
    legacySrc: "/images/brand/night.jpg",
    // Acompaña al 404 y no aporta información: se sirve con alt vacío.
    decorative: true,
    legacyAlt: "Vehículo de MILLE fotografiado de noche",
  },

  // --- Menú de navegación --------------------------------------------------
  //
  // Cada enlace del menú tiene su propia fotografía. Arrancan apuntando al
  // mismo archivo que usaba el código, pero son slots independientes: cambiar
  // la del menú de Contacto ya no cambia la portada de Contacto ni la 404.
  {
    key: "nav.vehicles",
    label: "Menú · Vehículos",
    description:
      "La fotografía que aparece al pasar por «Vehículos» en el menú de escritorio.",
    aspect: "Vertical 4:5. Solo se ve en escritorio, al abrir el menú.",
    frames: { desktop: { ...PORTRAIT_4_5, label: "Escritorio" }, mobile: null },
    mobileVariantRecommended: false,
    surface: "/",
    decorative: true,
    legacySrc: "/images/vehicles/bmw-m4-competition/01.jpg",
    legacyAlt: "BMW M4 Competition verde frente a un edificio de ladrillo",
  },
  {
    key: "nav.mille",
    label: "Menú · Nuestra historia",
    description:
      "La fotografía que aparece al pasar por «Nuestra historia» en el menú de escritorio.",
    aspect: "Vertical 4:5. Solo se ve en escritorio, al abrir el menú.",
    frames: { desktop: { ...PORTRAIT_4_5, label: "Escritorio" }, mobile: null },
    mobileVariantRecommended: false,
    surface: "/",
    decorative: true,
    legacySrc: "/images/brand/hero.jpg",
    legacyAlt:
      "BMW M3 con la identidad de MILLE frente a los cerros de Bogotá",
  },
  {
    key: "nav.sell",
    label: "Menú · Vender con MILLE",
    description:
      "La fotografía que aparece al pasar por «Vender con MILLE» en el menú de escritorio.",
    aspect: "Vertical 4:5. Solo se ve en escritorio, al abrir el menú.",
    frames: { desktop: { ...PORTRAIT_4_5, label: "Escritorio" }, mobile: null },
    mobileVariantRecommended: false,
    surface: "/",
    decorative: true,
    legacySrc: "/images/vehicles/porsche-macan/02.jpg",
    legacyAlt:
      "Porsche Cayenne gris sobre un empedrado de piedra, frente a un muro claro",
  },
  {
    key: "nav.culture",
    label: "Menú · Cultura motor",
    description:
      "La fotografía que aparece al pasar por «Cultura motor» en el menú de escritorio.",
    aspect: "Vertical 4:5. Solo se ve en escritorio, al abrir el menú.",
    frames: { desktop: { ...PORTRAIT_4_5, label: "Escritorio" }, mobile: null },
    mobileVariantRecommended: false,
    surface: "/",
    decorative: true,
    legacySrc: "/images/vehicles/bmw-r-1250-gs-adventure/01.jpg",
    legacyAlt:
      "Motociclista en una BMW R 1250 GS Adventure en una carretera de montaña",
  },
  {
    key: "nav.contact",
    label: "Menú · Contacto",
    description:
      "La fotografía que aparece al pasar por «Contacto» en el menú de escritorio.",
    aspect: "Vertical 4:5. Solo se ve en escritorio, al abrir el menú.",
    frames: { desktop: { ...PORTRAIT_4_5, label: "Escritorio" }, mobile: null },
    mobileVariantRecommended: false,
    surface: "/",
    decorative: true,
    legacySrc: "/images/brand/night.jpg",
    legacyAlt: "Vehículo de MILLE fotografiado de noche",
  },

  // --- Compartir en redes --------------------------------------------------
  {
    key: "seo.defaultOg",
    label: "Compartir · Imagen por defecto",
    description:
      "La fotografía que acompaña a un enlace del sitio en WhatsApp, Twitter o LinkedIn cuando la página no tiene una propia. Las fichas de vehículo usan la suya.",
    aspect:
      "Horizontal 1.91:1, el formato que piden las previsualizaciones. No se recorta en pantalla: la recortan ellas.",
    frames: {
      desktop: {
        label: "Previsualización",
        ratio: 1.91,
        recommended: { width: 2400, height: 1260 },
        minimum: { width: 1200, height: 630 },
      },
      mobile: null,
    },
    mobileVariantRecommended: false,
    surface: "/",
    decorative: true,
    legacySrc: "/images/brand/night.jpg",
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

/** Las dos variantes que puede tener un slot. */
export type SiteMediaVariant = "desktop" | "mobile";

/** Un archivo concreto: lo que hay que pintar. */
export interface SiteMediaFile {
  src: string;
  source: SiteMediaSource;
  focal: FocalPoint;
  /** Las del archivo, cuando se conocen. Las heredadas de /public no. */
  size: PixelSize | null;
  bytes: number | null;
  contentType: string | null;
}

/**
 * Lo que el frontend necesita para pintar un slot, con sus dos caras.
 *
 * `mobile` en `null` NO significa "no hay nada que enseñar en el teléfono":
 * significa que el teléfono usa el mismo archivo que el escritorio. El
 * encuadre de teléfono vive aparte y se aplica igual, porque elegir qué
 * parte se ve en vertical es útil aunque la fotografía sea la misma.
 */
export interface SiteMediaImage {
  alt: string;
  desktop: SiteMediaFile;
  /** Solo cuando se subió una fotografía propia para el teléfono. */
  mobile: SiteMediaFile | null;
  /** Se aplica en teléfono, exista o no variante propia. */
  mobileFocal: FocalPoint;
}

/** El valor de respaldo de un slot, tal como el sitio se construyó. */
export function legacyImage(slot: SiteMediaSlot): SiteMediaImage {
  return {
    alt: slot.legacyAlt,
    desktop: {
      src: slot.legacySrc,
      source: "legacy",
      // El sitio se construyó con todas centradas; el respaldo tiene que
      // verse igual que antes de que existiera el encuadre.
      focal: { ...CENTER_FOCAL },
      size: null,
      bytes: null,
      contentType: null,
    },
    mobile: null,
    mobileFocal: { ...CENTER_FOCAL },
  };
}

/** El archivo que corresponde a un viewport. Nunca devuelve nada vacío. */
export function fileForVariant(
  image: SiteMediaImage,
  variant: SiteMediaVariant,
): SiteMediaFile {
  if (variant === "desktop") return image.desktop;
  // El orden del respaldo: variante propia, si no la de escritorio. Nunca
  // una URL indefinida.
  return image.mobile ?? { ...image.desktop, focal: image.mobileFocal };
}

/**
 * Qué fotografía acompaña a cada enlace del menú.
 *
 * El menú tenía sus cinco rutas escritas a mano en el componente, y cuatro
 * de ellas apuntaban al mismo archivo que usaba otro slot: cambiar la
 * portada de Contacto cambiaba también la del menú y la de la 404, sin que
 * nadie lo hubiera pedido. Ahora cada enlace tiene su propio slot y el
 * componente solo sabe la correspondencia.
 */
export const NAV_MEDIA_BY_HREF: Readonly<Record<string, string>> = {
  "/vehiculos": "nav.vehicles",
  "/#mille": "nav.mille",
  "/#vender": "nav.sell",
  "/#cultura": "nav.culture",
  "/contacto": "nav.contact",
};
