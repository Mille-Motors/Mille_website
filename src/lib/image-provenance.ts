/**
 * De dónde salió una fotografía y por qué MILLE puede usarla.
 *
 * El sitio no cambia de aspecto por esto: la procedencia es trazabilidad
 * administrativa, no una marca de agua. Vive en el Admin y responde a una
 * sola pregunta —«¿por qué podemos usar esta foto?»— con la fuente, el
 * autor, la licencia y la prueba, cuando existen.
 *
 * Hay DOS orígenes de esa información y no se mezclan:
 *
 *   1. Los archivos del REPOSITORIO (`/public/images/…`). Su procedencia es
 *      un hecho ya registrado en `public/images/*​/CREDITS.json` desde que se
 *      descargaron, así que vive aquí, en código, junto al archivo que
 *      describe. No hace falta —ni conviene— copiarla a la base: una fila
 *      que describe un archivo del repositorio se desincronizaría del
 *      repositorio.
 *
 *   2. Lo que alguien SUBIÓ desde el Admin a Storage. Eso no lo sabe nadie
 *      más que quien lo subió, así que se escribe en la base: en el vehículo
 *      —el lote fotográfico, que es como llegan las fotos de un carro— y, si
 *      una foto concreta viene de otra parte, en esa foto.
 *
 * Lo que NO se hace es inventar una autorización. Una fotografía subida sin
 * procedencia registrada queda `pending`, y eso es una respuesta: significa
 * que todavía nadie ha dejado constancia de dónde salió. No se bloquea, no
 * se despublica y no se le pone una licencia de relleno.
 */

/**
 * De qué clase de fuente viene la fotografía.
 *
 * `own` es producción de MILLE; `owner` y `dealer`, material que entrega
 * quien ofrece el vehículo; `photographer`, un encargo; `stock`, banco de
 * imágenes con licencia; `manufacturer`, material de prensa de la marca.
 */
export const IMAGE_SOURCE_TYPES = [
  "own",
  "owner",
  "dealer",
  "photographer",
  "stock",
  "manufacturer",
  "other",
] as const;

export type ImageSourceType = (typeof IMAGE_SOURCE_TYPES)[number];

export const IMAGE_SOURCE_TYPE_LABELS: Readonly<Record<ImageSourceType, string>> = {
  own: "Fotografía propia de MILLE",
  owner: "Suministrada por el propietario",
  dealer: "Material del dealer",
  photographer: "Fotógrafo autorizado",
  stock: "Banco de imágenes con licencia",
  manufacturer: "Material de prensa del fabricante",
  other: "Otra fuente",
};

export function isImageSourceType(value: unknown): value is ImageSourceType {
  return (
    typeof value === "string" &&
    (IMAGE_SOURCE_TYPES as readonly string[]).includes(value)
  );
}

/**
 * La fuente tal como la guarda Postgres, de vuelta al vocabulario del
 * dominio.
 *
 * Los enums viajan en MAYÚSCULAS hacia la base y en minúsculas hacia la
 * interfaz, igual que el resto del proyecto. Se traduce aquí y no en cada
 * lector: cuando no estaba, leer una fila con `OWNER` devolvía «sin
 * procedencia registrada» —porque `OWNER` no está en el vocabulario— y una
 * fotografía documentada aparecía como pendiente.
 */
function imageSourceTypeFromDb(value: unknown): ImageSourceType | null {
  if (typeof value !== "string") return null;
  const lower = value.toLowerCase();
  return isImageSourceType(lower) ? lower : null;
}

/**
 * La procedencia de una fotografía.
 *
 * `sourceType` es el único campo obligatorio, y es deliberado: es el que
 * convierte «no sabemos» en «lo sabemos», y pedir diez datos para registrar
 * que un propietario mandó las fotos por WhatsApp haría que nadie registrara
 * nada. Todo lo demás es nulo cuando no se conoce, nunca cadena vacía.
 *
 * `proofRef` no guarda la prueba: la señala. Un hilo de correo, una
 * referencia de contrato, el archivo donde está. La prueba vive donde ya
 * esté; aquí queda cómo encontrarla.
 */
export interface ImageRights {
  sourceType: ImageSourceType;
  /** Quién entregó el material: un propietario, un dealer, un banco. */
  sourceName: string | null;
  /** Quién tomó la fotografía, cuando se sabe y no coincide con la fuente. */
  author: string | null;
  sourceUrl: string | null;
  licenseType: string | null;
  licenseUrl: string | null;
  /**
   * Si la licencia EXIGE citar al autor donde se publique la fotografía.
   * Hoy ninguna de las que usa el sitio lo exige, así que el sitio público
   * no pinta créditos; el Admin sí lo dice, porque es parte de la respuesta
   * a «¿por qué podemos usar esta foto?».
   */
  licenseRequiresAttribution: boolean;
  /** Día en que se obtuvo el material. `@db.Date`: es un día, no un instante. */
  acquiredOn: string | null;
  authorizedBy: string | null;
  proofRef: string | null;
  notes: string | null;
}

/**
 * Quién respondió la pregunta.
 *
 * `repository` es un archivo del repositorio con sus créditos en código;
 * `image`, la procedencia escrita para esa fotografía concreta; `vehicle`,
 * la del lote al que pertenece. El orden importa y se resuelve en
 * {@link resolveImageRights}.
 */
export type ImageRightsOrigin = "repository" | "image" | "vehicle";

export const IMAGE_RIGHTS_ORIGIN_LABELS: Readonly<Record<ImageRightsOrigin, string>> = {
  repository: "Archivo del repositorio",
  image: "Registrada en esta fotografía",
  vehicle: "Registrada en el lote del vehículo",
};

/**
 * La procedencia efectiva de una fotografía, ya resuelta.
 *
 * `pending` no es un error ni un bloqueo: es el estado honesto de una
 * fotografía cuya procedencia nadie ha registrado todavía.
 */
export type ResolvedImageRights =
  | { status: "documented"; origin: ImageRightsOrigin; rights: ImageRights }
  | { status: "pending"; origin: null; rights: null };

const PENDING_RIGHTS: ResolvedImageRights = {
  status: "pending",
  origin: null,
  rights: null,
};

/**
 * La licencia de Unsplash, que es la de todo el material de banco del
 * repositorio. No exige atribución —la «agradece»—, y la diferencia importa:
 * por eso el sitio público no pinta créditos y el Admin puede decir que no
 * hacen falta sin que nadie tenga que ir a leer la licencia.
 *
 * LO QUE UNA LICENCIA DE BANCO NO ES. Cubre los derechos de autor del
 * FOTÓGRAFO sobre la imagen, y nada más. No es, y no se debe leer como:
 *
 *   - autorización del PROPIETARIO del vehículo fotografiado;
 *   - licencia sobre las MARCAS que aparezcan en la fotografía;
 *   - autorización de uso de imagen de las PERSONAS que salgan en ella.
 *
 * Son cuatro derechos distintos con cuatro titulares distintos, y por eso
 * `authorizedBy` se queda en `null` en estas entradas: nadie «autorizó» nada,
 * hay una licencia de plataforma. Rellenarlo con «Unsplash» convertiría una
 * licencia en una autorización que no existe, que es exactamente el tipo de
 * dato inventado que este sistema está para no tener.
 */
const UNSPLASH_LICENSE_URL = "https://unsplash.com/license";

function unsplash(author: string, sourceUrl: string): ImageRights {
  return {
    sourceType: "stock",
    sourceName: "Unsplash",
    author,
    sourceUrl,
    licenseType: "Unsplash License",
    licenseUrl: UNSPLASH_LICENSE_URL,
    licenseRequiresAttribution: false,
    acquiredOn: null,
    authorizedBy: null,
    proofRef: "public/images/vehicles/CREDITS.json",
    notes: null,
  };
}

/**
 * Los archivos del repositorio y su procedencia, tal como quedó registrada
 * al descargarlos.
 *
 * Se genera a partir de `public/images/brand/CREDITS.json` y
 * `public/images/vehicles/CREDITS.json`, que siguen siendo la fuente: si se
 * añade o reemplaza un archivo en `/public`, se actualizan los dos sitios.
 * Una clave que no esté aquí queda `pending`, que es lo correcto —un archivo
 * sin créditos registrados no tiene procedencia conocida—.
 *
 * Las claves son la ruta pública exacta, que es lo que guardan `url` en
 * `VehicleImage` y `legacySrc` en los espacios del sitio.
 */
export const REPOSITORY_IMAGE_RIGHTS: Readonly<Record<string, ImageRights>> = {
  // --- Marca ---------------------------------------------------------------
  "/images/brand/hero.jpg": {
    sourceType: "own",
    sourceName: "MILLE Motor Culture",
    author: null,
    sourceUrl: null,
    licenseType: "Material propio",
    licenseUrl: null,
    licenseRequiresAttribution: false,
    acquiredOn: null,
    authorizedBy: null,
    proofRef: "public/images/brand/CREDITS.json",
    notes: "Render de referencia de marca, propio de MILLE.",
  },
  "/images/brand/interior.jpg": unsplash("James Lee", "https://unsplash.com/photos/quilted-brown-leather-rJeJljGwHOY"),
  "/images/brand/night.jpg": unsplash("Dardan Motors", "https://unsplash.com/photos/black-mercedes-benz-g-class-suv-on-road-during-daytime-t3mTem93sFI"),

  // --- Inventario ----------------------------------------------------------
  // bmw-x5-xdrive40i
  "/images/vehicles/bmw-x5-xdrive40i/01.jpg": unsplash("Dmitriy Sidorov", "https://unsplash.com/photos/a-white-bmw-suv-parked-in-a-parking-lot-56tzohFw8EU"),
  "/images/vehicles/bmw-x5-xdrive40i/02.jpg": unsplash("Sam", "https://unsplash.com/photos/a-white-bmw-suv-parked-on-the-side-of-the-road-dAxYYeFRtWI"),
  "/images/vehicles/bmw-x5-xdrive40i/03.jpg": unsplash("Håkon Sataøen", "https://unsplash.com/photos/white-hatchback-car-beside-road-OMR_J_PFOb0"),
  "/images/vehicles/bmw-x5-xdrive40i/04.jpg": unsplash("Jan Kopřiva", "https://unsplash.com/photos/white-suv-on-brown-field-during-sunset-blaEhjcCyV8"),
  // bmw-x5-xdrive45e
  "/images/vehicles/bmw-x5-xdrive45e/01.jpg": unsplash("Dardan Motors", "https://unsplash.com/photos/black-mercedes-benz-g-class-suv-on-road-during-daytime-t3mTem93sFI"),
  "/images/vehicles/bmw-x5-xdrive45e/02.jpg": unsplash("Daniel Gutko", "https://unsplash.com/photos/a-black-bmw-x5-parked-on-the-side-of-the-road-tShF65IfzHg"),
  "/images/vehicles/bmw-x5-xdrive45e/03.jpg": unsplash("Angelica Levshakowa", "https://unsplash.com/photos/a-black-car-parked-in-a-parking-garage-QwUqc4nds0c"),
  "/images/vehicles/bmw-x5-xdrive45e/04.jpg": unsplash("Angelica Levshakowa", "https://unsplash.com/photos/a-close-up-of-a-black-car-in-the-dark-eTGcQEMxEpw"),
  // mercedes-benz-gle-450
  "/images/vehicles/mercedes-benz-gle-450/01.jpg": unsplash("Dekler Ph", "https://unsplash.com/photos/a-white-car-parked-on-a-street-5082j_yQzQQ"),
  "/images/vehicles/mercedes-benz-gle-450/02.jpg": unsplash("Dekler Ph", "https://unsplash.com/photos/a-black-car-parked-on-pavement-suYT1tHhRIA"),
  "/images/vehicles/mercedes-benz-gle-450/03.jpg": unsplash("Александр Бендус", "https://unsplash.com/photos/a-white-mercedes-benz-benz-benz-benz-benz-benz-benz-benz-benz-benz-benz-benz-benz-c6RAUFIoDsY"),
  "/images/vehicles/mercedes-benz-gle-450/04.jpg": unsplash("Javier Esteban", "https://unsplash.com/photos/silver-bmw-x-6-parked-on-gray-concrete-floor-ZFJtQcv5bRI"),
  // porsche-macan
  "/images/vehicles/porsche-macan/01.jpg": unsplash("NAM CZ", "https://unsplash.com/photos/a-black-car-parked-in-a-parking-lot-P11bcs0CfDU"),
  "/images/vehicles/porsche-macan/02.jpg": unsplash("Rico Reynaldi", "https://unsplash.com/photos/a-grey-porsche-cayen-is-parked-in-a-parking-lot-BRTO8ru7-M8"),
  "/images/vehicles/porsche-macan/03.jpg": unsplash("stefzn", "https://unsplash.com/photos/black-and-brown-nissan-steering-wheel-wjsbdnWotC0"),
  "/images/vehicles/porsche-macan/04.jpg": unsplash("Ales Krivec", "https://unsplash.com/photos/a-close-up-of-a-car-exhaust-pipe-nYyrFp6Jtn0"),
  // toyota-land-cruiser-prado
  "/images/vehicles/toyota-land-cruiser-prado/01.jpg": unsplash("Tim Vegas", "https://unsplash.com/photos/a-black-toyota-land-cruiser-parked-in-front-of-a-building-r3cA8C6a-UA"),
  "/images/vehicles/toyota-land-cruiser-prado/02.jpg": unsplash("Suryaprakash V", "https://unsplash.com/photos/a-white-toyota-land-cruiser-parked-on-the-beach-IQDZAT8opDo"),
  "/images/vehicles/toyota-land-cruiser-prado/03.jpg": unsplash("Nikolas Noonan", "https://unsplash.com/photos/silver-toyota-land-cruiser-parked-on-ground-during-daytime-JuEtWryZhag"),
  "/images/vehicles/toyota-land-cruiser-prado/04.jpg": unsplash("Casey Horner", "https://unsplash.com/photos/a-city-street-at-night-with-cars-and-buildings-FE8D4Z18T58"),
  // bmw-330e
  "/images/vehicles/bmw-330e/01.jpg": unsplash("Jon Koop", "https://unsplash.com/photos/white-bmw-car-on-street-khYVyHiNZo0"),
  "/images/vehicles/bmw-330e/02.jpg": unsplash("Stephan Louis", "https://unsplash.com/photos/white-bmw-m-3-coupe-parked-near-brown-trees-during-daytime-mN8H_fe040Y"),
  "/images/vehicles/bmw-330e/03.jpg": unsplash("Chris Saran", "https://unsplash.com/photos/a-white-car-parked-in-a-parking-garage-iXHHhfwJD1E"),
  "/images/vehicles/bmw-330e/04.jpg": unsplash("Zan Lazarevic", "https://unsplash.com/photos/blue-bmw-coupe-parked-on-the-road-during-daytime-1BWBiUUT-AA"),
  // bmw-x3-xdrive30i
  "/images/vehicles/bmw-x3-xdrive30i/01.jpg": unsplash("Александр Бендус", "https://unsplash.com/photos/a-black-bmw-suv-parked-in-a-parking-lot-1_Mha1F-vPQ"),
  "/images/vehicles/bmw-x3-xdrive30i/02.jpg": unsplash("Александр Бендус", "https://unsplash.com/photos/a-black-car-parked-on-the-side-of-a-road-4exSmqgruSM"),
  "/images/vehicles/bmw-x3-xdrive30i/03.jpg": unsplash("Александр Бендус", "https://unsplash.com/photos/the-interior-of-a-car-with-a-dashboard-steering-wheel-and-dash-board-63dYWiztUYk"),
  "/images/vehicles/bmw-x3-xdrive30i/04.jpg": unsplash("Andrei Poenalte", "https://unsplash.com/photos/a-white-bmw-suv-driving-down-a-city-street-hjCnlLUbpxQ"),
  // bmw-m4-competition
  "/images/vehicles/bmw-m4-competition/01.jpg": unsplash("Eugene Tkachenko", "https://unsplash.com/photos/green-sedan-on-cobblestone-street-xTbW23R8N3g"),
  "/images/vehicles/bmw-m4-competition/02.jpg": unsplash("Rodan Can", "https://unsplash.com/photos/black-coupe-on-road-6cqJPeTIuls"),
  "/images/vehicles/bmw-m4-competition/03.jpg": unsplash("Leon Seibert", "https://unsplash.com/photos/blue-bmw-car-on-road-during-daytime-1RiyAwNIiew"),
  "/images/vehicles/bmw-m4-competition/04.jpg": unsplash("Zan Lazarevic", "https://unsplash.com/photos/blue-bmw-coupe-parked-on-the-road-during-daytime-1BWBiUUT-AA"),
  // audi-q5-45-tfsi
  "/images/vehicles/audi-q5-45-tfsi/01.jpg": unsplash("Deniz Demirci", "https://unsplash.com/photos/a-white-car-parked-in-front-of-a-building-BTnw2BSRUXA"),
  "/images/vehicles/audi-q5-45-tfsi/02.jpg": unsplash("Hostaphoto", "https://unsplash.com/photos/grayscale-photo-of-mercedes-benz-coupe-parked-beside-tree-ywlNBiCjebQ"),
  "/images/vehicles/audi-q5-45-tfsi/03.jpg": unsplash("Maksym Tymchyk 🇺🇦", "https://unsplash.com/photos/black-sedan-on-road-during-daytime-bb6NaemzpGY"),
  "/images/vehicles/audi-q5-45-tfsi/04.jpg": unsplash("Sebin Lalu", "https://unsplash.com/photos/black-car-with-white-license-plate-10IYRzI3j1g"),
  // audi-q7-55-tfsi
  "/images/vehicles/audi-q7-55-tfsi/01.jpg": unsplash("John Holden", "https://unsplash.com/photos/gray-car-parked-near-brown-building-zVOULkBBh6A"),
  "/images/vehicles/audi-q7-55-tfsi/02.jpg": unsplash("Deniz Demirci", "https://unsplash.com/photos/a-white-car-parked-in-a-dark-room-1Y9G4ZMnBzU"),
  "/images/vehicles/audi-q7-55-tfsi/03.jpg": unsplash("Sebin Lalu", "https://unsplash.com/photos/black-car-with-white-license-plate-10IYRzI3j1g"),
  "/images/vehicles/audi-q7-55-tfsi/04.jpg": unsplash("David Moffatt", "https://unsplash.com/photos/a-black-car-parked-in-a-parking-lot-vNiiA6YfuiA"),
  // audi-rs-5-sportback
  "/images/vehicles/audi-rs-5-sportback/01.jpg": unsplash("Vlad Grebenyev", "https://unsplash.com/photos/a-car-driving-on-a-road-E2hj4Q712Hs"),
  "/images/vehicles/audi-rs-5-sportback/02.jpg": unsplash("Dmitriy Sidorov", "https://unsplash.com/photos/a-silver-car-parked-in-front-of-a-building-lqVDIN6zb1g"),
  "/images/vehicles/audi-rs-5-sportback/03.jpg": unsplash("David Moffatt", "https://unsplash.com/photos/a-blue-car-parked-on-a-street-N5C_latUR4E"),
  "/images/vehicles/audi-rs-5-sportback/04.jpg": unsplash("Callum Hill", "https://unsplash.com/photos/yellow-lamborghini-aventador-on-road-during-night-time-TNvGsWoFQ0A"),
  // mercedes-benz-glc-300
  "/images/vehicles/mercedes-benz-glc-300/01.jpg": unsplash("Mohamed Reshad", "https://unsplash.com/photos/white-bmw-m-3-coupe-on-brown-sand-during-sunset-bvJmFvLNbj0"),
  "/images/vehicles/mercedes-benz-glc-300/02.jpg": unsplash("Rana Singh", "https://unsplash.com/photos/close-up-of-a-dark-mercedes-benz-suv-grille-83A3XcRbyeo"),
  "/images/vehicles/mercedes-benz-glc-300/03.jpg": unsplash("Mr Dibo", "https://unsplash.com/photos/a-white-car-on-a-road-S5Th_yrifOY"),
  "/images/vehicles/mercedes-benz-glc-300/04.jpg": unsplash("Mr Dibo", "https://unsplash.com/photos/a-white-car-on-a-dirt-road-PrD-ocyzzZ8"),
  // volvo-xc60-recharge
  "/images/vehicles/volvo-xc60-recharge/01.jpg": unsplash("Remy Lovesy", "https://unsplash.com/photos/blue-bmw-m-3-coupe-on-brown-field-under-blue-and-white-sunny-cloudy-sky-during-95Kt-AcCU5Y"),
  "/images/vehicles/volvo-xc60-recharge/02.jpg": unsplash("Neil Thomas", "https://unsplash.com/photos/red-volvo-suv-parking-on-green-field-vCX0NQeXWiY"),
  "/images/vehicles/volvo-xc60-recharge/03.jpg": unsplash("Luca Massimilian", "https://unsplash.com/photos/red-car-on-black-asphalt-road-under-gray-cloudy-sky-JrWu8PBdsqM"),
  "/images/vehicles/volvo-xc60-recharge/04.jpg": unsplash("Clayton Malquist", "https://unsplash.com/photos/black-bmw-car-steering-wheel-NyhAqEwNouw"),
  // jeep-grand-cherokee-limited
  "/images/vehicles/jeep-grand-cherokee-limited/01.jpg": unsplash("Travis Essinger", "https://unsplash.com/photos/gray-jeep-suv-parked-on-road-3V0FGLkueyA"),
  "/images/vehicles/jeep-grand-cherokee-limited/02.jpg": unsplash("Kirk Thornton", "https://unsplash.com/photos/gray-jeep-cherokee-beside-plants--OLSPnMTwPc"),
  "/images/vehicles/jeep-grand-cherokee-limited/03.jpg": unsplash("A K", "https://unsplash.com/photos/a-jeep-driving-down-a-road-next-to-a-forest-CT1get2io4c"),
  "/images/vehicles/jeep-grand-cherokee-limited/04.jpg": unsplash("Jakob Rosen", "https://unsplash.com/photos/white-bmw-x-6-parked-on-parking-lot-during-daytime-5EntHyHwi24"),
  // bmw-r-1250-gs-adventure
  "/images/vehicles/bmw-r-1250-gs-adventure/01.jpg": unsplash("Ilya Godze", "https://unsplash.com/photos/motorcyclist-riding-on-a-dirt-road-with-mountains-behind-GzhN4pnnA1U"),
  "/images/vehicles/bmw-r-1250-gs-adventure/02.jpg": unsplash("Claude Nai", "https://unsplash.com/photos/a-black-motorcycle-parked-on-a-cobblestone-street-ocvadOdh2S0"),
  "/images/vehicles/bmw-r-1250-gs-adventure/03.jpg": unsplash("CARTIST SARVAM", "https://unsplash.com/photos/two-men-stand-beside-a-parked-adventure-motorcycle-2mZsKtsbzVM"),
  "/images/vehicles/bmw-r-1250-gs-adventure/04.jpg": unsplash("Claude Nai", "https://unsplash.com/photos/a-black-and-silver-motorcycle-parked-in-front-of-a-building-U1RoGHF6iIs"),
  // mercedes-benz-c-300
  "/images/vehicles/mercedes-benz-c-300/01.jpg": unsplash("Benjamin Zhao", "https://unsplash.com/photos/black-bmw-m-3-coupe-parked-on-gray-concrete-pavement-8hxq0T0WLTQ"),
  "/images/vehicles/mercedes-benz-c-300/02.jpg": unsplash("Brice Cooper", "https://unsplash.com/photos/a-black-car-parked-on-the-side-of-the-road-33jyO4XRtOY"),
  "/images/vehicles/mercedes-benz-c-300/03.jpg": unsplash("Mikolaj Górzyński", "https://unsplash.com/photos/a-black-car-parked-next-to-a-white-car-341Jd6-foKo"),
  "/images/vehicles/mercedes-benz-c-300/04.jpg": unsplash("Afif Ramdhasuma", "https://unsplash.com/photos/silver-round-ornament-on-white-and-gray-stripe-textile-hl8yZ0Qk65I"),
  // bmw-i4-edrive40
  "/images/vehicles/bmw-i4-edrive40/01.jpg": unsplash("Varun Palaniappan", "https://unsplash.com/photos/a-silver-car-parked-on-the-side-of-the-road-WONFd4Wd9bA"),
  "/images/vehicles/bmw-i4-edrive40/02.jpg": unsplash("Johnathan Kaufman", "https://unsplash.com/photos/white-bmw-car-with-blue-and-white-logo-5Cz-q2Ro53o"),
  "/images/vehicles/bmw-i4-edrive40/03.jpg": unsplash("Eren Goldman", "https://unsplash.com/photos/an-electric-car-plugged-in-to-a-charging-station-mfqj3ZSs_h0"),
  "/images/vehicles/bmw-i4-edrive40/04.jpg": unsplash("Martin Katler", "https://unsplash.com/photos/bmw-ix3-electric-car-front-view-n7uq7D7wgCQ"),
  // honda-africa-twin-adventure-sports
  "/images/vehicles/honda-africa-twin-adventure-sports/01.jpg": unsplash("Victor", "https://unsplash.com/photos/a-red-motorcycle-parked-in-front-of-a-field-of-flowers-5wjagbTPryA"),
  "/images/vehicles/honda-africa-twin-adventure-sports/02.jpg": unsplash("Milan Csizmadia", "https://unsplash.com/photos/a-close-up-of-a-motorcycle-parked-on-a-street-Tg_ywI8I23E"),
  "/images/vehicles/honda-africa-twin-adventure-sports/03.jpg": unsplash("Erez Gavish", "https://unsplash.com/photos/black-and-silver-sports-bike-on-brown-field-during-daytime-lboHZ8wPcD8"),
  // ducati-monster-937
  "/images/vehicles/ducati-monster-937/01.jpg": unsplash("Andrés Dallimonti", "https://unsplash.com/photos/red-and-black-motorcycle-on-green-grass-field-during-daytime-ofvDiR_vLmI"),
  "/images/vehicles/ducati-monster-937/02.jpg": unsplash("Baptiste DAVID", "https://unsplash.com/photos/two-motorcycles-parked-next-to-each-other-in-front-of-a-building-g-7fQ8TtlQI"),
  "/images/vehicles/ducati-monster-937/03.jpg": unsplash("Baptiste DAVID", "https://unsplash.com/photos/a-man-standing-next-to-a-red-motorcycle-XfbjTaxSnuw"),
  // kawasaki-ninja-zx-10r
  "/images/vehicles/kawasaki-ninja-zx-10r/01.jpg": unsplash("Pairach Boriboonmee", "https://unsplash.com/photos/black-and-green-sports-bike-on-road-during-sunset-18BJZgL0Y-M"),
  "/images/vehicles/kawasaki-ninja-zx-10r/02.jpg": unsplash("Pairach Boriboonmee", "https://unsplash.com/photos/white-and-green-sports-bike-on-road-during-daytime-PDMR0_IUjro"),
  "/images/vehicles/kawasaki-ninja-zx-10r/03.jpg": unsplash("Jaxon Smith", "https://unsplash.com/photos/a-black-motorcycle-is-on-display-in-a-showroom-PNQ1TlFviIk"),
  // ktm-500-exc-f
  "/images/vehicles/ktm-500-exc-f/01.jpg": unsplash("Sylvester Sabo", "https://unsplash.com/photos/a-dirt-bike-parked-on-top-of-a-dirt-field-3xbX0tJlkwQ"),
  "/images/vehicles/ktm-500-exc-f/02.jpg": unsplash("Robin Thunholm", "https://unsplash.com/photos/black-and-white-honda-motorcycle-Mto_TlxyWM4"),
  "/images/vehicles/ktm-500-exc-f/03.jpg": unsplash("Robin Thunholm", "https://unsplash.com/photos/black-and-red-motocross-dirt-bike-on-road-during-daytime-bhzivJ-kbsg"),
  // harley-davidson-iron-883
  "/images/vehicles/harley-davidson-iron-883/01.jpg": unsplash("Chris Kursikowski", "https://unsplash.com/photos/black-and-gray-motorcycle-parked-beside-brown-brick-wall-rQ3yO2GnO_M"),
  "/images/vehicles/harley-davidson-iron-883/02.jpg": unsplash("Harley-Davidson", "https://unsplash.com/photos/black-motorcycle-near-wall-with-grafitti-2S4FDh3AtGw"),
  "/images/vehicles/harley-davidson-iron-883/03.jpg": unsplash("Harley-Davidson", "https://unsplash.com/photos/parked-black-motorcycle-wxSb4-Lxt3Y"),
};

/** La procedencia registrada en el repositorio para una ruta pública. */
export function repositoryImageRights(src: string): ImageRights | null {
  return REPOSITORY_IMAGE_RIGHTS[src] ?? null;
}

/**
 * La procedencia efectiva de una fotografía, en el orden que manda.
 *
 * 1. Lo registrado para ESA fotografía. Un override existe para decir que
 *    esta foto concreta no viene de donde vinieron las demás.
 * 2. Lo registrado para el LOTE —el vehículo—, que es como llegan las fotos
 *    de un carro: todas del propietario, o todas del dealer.
 * 3. Los créditos del repositorio, si el archivo es del repositorio.
 *
 * El bloque gana ENTERO, no campo a campo. Mezclar el autor de un dealer con
 * la licencia de un banco de imágenes produciría una respuesta que no
 * describe a nadie: si una foto tiene procedencia propia, es la suya.
 */
export function resolveImageRights(input: {
  image?: ImageRights | null;
  vehicle?: ImageRights | null;
  /** La ruta pública, para los archivos que viven en el repositorio. */
  src?: string | null;
}): ResolvedImageRights {
  if (input.image) {
    return { status: "documented", origin: "image", rights: input.image };
  }
  if (input.vehicle) {
    return { status: "documented", origin: "vehicle", rights: input.vehicle };
  }
  const repository = input.src ? repositoryImageRights(input.src) : null;
  if (repository) {
    return { status: "documented", origin: "repository", rights: repository };
  }
  return PENDING_RIGHTS;
}

/**
 * Lee un bloque de procedencia de las columnas de una fila.
 *
 * Devuelve `null` cuando no hay `sourceType`, que es exactamente lo que
 * significa «nadie registró la procedencia»: las demás columnas pueden
 * tener restos de una edición a medias y por sí solas no documentan nada.
 */
export function imageRightsFromColumns(row: {
  rightsSourceType: string | null;
  rightsSourceName: string | null;
  rightsAuthor: string | null;
  rightsSourceUrl: string | null;
  rightsLicenseType: string | null;
  rightsLicenseUrl: string | null;
  rightsLicenseRequiresAttribution: boolean;
  rightsAcquiredOn: Date | null;
  rightsAuthorizedBy: string | null;
  rightsProofRef: string | null;
  rightsNotes: string | null;
}): ImageRights | null {
  const sourceType = imageSourceTypeFromDb(row.rightsSourceType);
  if (!sourceType) return null;
  return {
    sourceType,
    sourceName: row.rightsSourceName,
    author: row.rightsAuthor,
    sourceUrl: row.rightsSourceUrl,
    licenseType: row.rightsLicenseType,
    licenseUrl: row.rightsLicenseUrl,
    licenseRequiresAttribution: row.rightsLicenseRequiresAttribution,
    // Solo el día: `@db.Date` guarda un día del calendario y convertirlo a
    // instante lo corría una fecha al leerlo en Bogotá, igual que el SOAT.
    acquiredOn: row.rightsAcquiredOn
      ? row.rightsAcquiredOn.toISOString().slice(0, 10)
      : null,
    authorizedBy: row.rightsAuthorizedBy,
    proofRef: row.rightsProofRef,
    notes: row.rightsNotes,
  };
}
