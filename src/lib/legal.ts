/**
 * Los documentos legales del sitio y quién responde por el tratamiento.
 *
 * Es la fuente ÚNICA de las versiones. Antes la fecha estaba escrita a mano
 * en cada página —«17 de octubre de 2026» en tres archivos— y la versión en
 * un cuarto: eso significa que una corrección podía cambiar el texto sin
 * cambiar la versión, y entonces un consentimiento guardado deja de poder
 * demostrar qué se mostró. Aquí la versión es la fecha, la fecha se escribe
 * una vez y el texto humano se deriva de ella.
 *
 * REGLA: la versión cambia cuando el documento cambia de forma MATERIAL —qué
 * se trata, para qué, quién responde, qué derechos, cómo se ejercen—. Una
 * corrección de redacción que no altera ninguna de esas respuestas no es una
 * versión nueva, porque los consentimientos ya otorgados siguen describiendo
 * lo mismo. Y una versión ya publicada no se reescribe nunca: los
 * `ConsentEvent` antiguos siguen apuntando a ella.
 */

/** Los tres documentos legales del sitio. */
export const LEGAL_DOCUMENTS = ["terms", "privacy", "cookies"] as const;

export type LegalDocument = (typeof LEGAL_DOCUMENTS)[number];

/**
 * La versión vigente de cada documento, en formato `AAAA-MM-DD`.
 *
 * Cookies se queda en su fecha anterior a propósito: en esta ronda se
 * reorganizó su redacción pero no cambió ninguna respuesta —el sitio sigue
 * usando solo almacenamiento estrictamente necesario—, y subir la versión
 * sin cambio material haría creer que algo cambió.
 */
export const LEGAL_VERSIONS: Readonly<Record<LegalDocument, string>> = {
  terms: "2026-10-19",
  privacy: "2026-10-19",
  cookies: "2026-10-17",
};

export const LEGAL_PATHS: Readonly<Record<LegalDocument, string>> = {
  terms: "/terminos",
  privacy: "/privacidad",
  cookies: "/cookies",
};

export const LEGAL_TITLES: Readonly<Record<LegalDocument, string>> = {
  terms: "Términos y Condiciones",
  privacy: "Política de Tratamiento de Datos Personales",
  cookies: "Política de Cookies",
};

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/**
 * La versión, leída por una persona: «19 de octubre de 2026».
 *
 * Se parsea a mano y no con `new Date()` porque `new Date("2026-10-19")` es
 * medianoche UTC, y en Bogotá —UTC−5— eso es el 18 por la tarde: la fecha
 * publicada se correría un día. Es el mismo motivo por el que los
 * vencimientos del vehículo son `@db.Date`.
 */
export function formatLegalVersion(version: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(version);
  if (!match) return version;
  const [, year, month, day] = match;
  return `${Number(day)} de ${MONTHS[Number(month) - 1]} de ${year}`;
}

// ---------------------------------------------------------------------------
// Responsable del Tratamiento
// ---------------------------------------------------------------------------

/**
 * Quién decide sobre el tratamiento, cuando esté confirmado.
 *
 * La Ley 1581 de 2012 (art. 3, lit. e) admite que el Responsable sea una
 * persona natural o jurídica «que por sí misma o en asocio con otros, decida
 * sobre la base de datos y/o el Tratamiento», así que una marca operada por
 * dos personas naturales en asocio es una figura prevista y no hay que
 * inventarle una sociedad para tener una política válida.
 *
 * Lo que NO se puede inventar es la identificación. El art. 12, lit. d) de
 * la ley y el art. 13, num. 1 del Decreto 1377 de 2013 —compilado en el
 * Decreto 1074 de 2015— exigen nombre, domicilio, dirección, correo y
 * teléfono del Responsable, y un nombre legal completo deducido de un
 * nombre abreviado no es un nombre legal completo.
 *
 * Por eso esta lista arranca VACÍA, igual que `site.email` y `site.phone`
 * arrancaron en `null` mientras no existieron: la política detecta que está
 * vacía y lo dice en voz alta en vez de publicar una identificación falsa.
 * Rellenarla —con los nombres tal como aparecen en el documento de
 * identidad— es cambiar este archivo y nada más, y eso sí es un cambio
 * material: sube la versión de la política.
 */
export interface LegalResponsible {
  /** El nombre completo tal como figura en el documento de identidad. */
  legalName: string;
  /** El tipo de documento y su número: cédula de ciudadanía, o NIT. */
  identification: string;
}

export const LEGAL_RESPONSIBLES: readonly LegalResponsible[] = [];

/**
 * Los canales por los que el Titular ejerce sus derechos.
 *
 * `email` es el buzón oficial de MILLE, confirmado por el fundador. Sirve
 * hoy como canal general y como canal electrónico para consultas y reclamos
 * de protección de datos; cuando exista uno especializado, se cambia aquí.
 *
 * `physicalAddress` sigue en `null` porque MILLE no tiene una dirección de
 * notificaciones confirmada, y la dirección de residencia de nadie se
 * publica como dirección de una marca. `domicile` sí está confirmado y es
 * lo que la norma llama domicilio: la ciudad.
 */
export const LEGAL_CONTACT: {
  email: string;
  domicile: string;
  physicalAddress: string | null;
} = {
  email: "millemotorculture@gmail.com",
  domicile: "Bogotá, Colombia",
  physicalAddress: null,
};

/**
 * Si la política ya puede identificar al Responsable como exige la norma.
 *
 * Lo consulta la propia política —para decir la verdad sobre su estado— y la
 * pantalla de Configuración del Admin, que es donde se ve qué falta.
 */
export function responsibleIdentified(): boolean {
  return LEGAL_RESPONSIBLES.length > 0;
}

/**
 * Lo que falta para que la política esté completa, en lenguaje de quien
 * tiene que conseguirlo. Vacío significa que no falta nada.
 */
export function legalIdentityGaps(): string[] {
  const gaps: string[] = [];
  if (!responsibleIdentified()) {
    gaps.push(
      "Nombre legal completo e identificación de la persona o personas Responsables del Tratamiento",
    );
  }
  if (!LEGAL_CONTACT.physicalAddress) {
    gaps.push("Dirección física de notificaciones del Responsable");
  }
  return gaps;
}

/**
 * La página de la autoridad de protección al consumidor de Colombia.
 *
 * El art. 50, parágrafo, de la Ley 1480 de 2011 pide que quien ofrece
 * productos por medios electrónicos ponga un enlace visible y fácilmente
 * identificable a esa página. Va en el pie, que es donde está el resto de lo
 * legal y lo que se ve desde cualquier página del sitio.
 */
export const CONSUMER_AUTHORITY = {
  name: "Superintendencia de Industria y Comercio",
  shortName: "Superintendencia de Industria y Comercio",
  url: "https://www.sic.gov.co/",
} as const;
