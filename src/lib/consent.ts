import { LEGAL_PATHS, LEGAL_VERSIONS } from "@/lib/legal";

/**
 * El consentimiento del Titular: qué autorizó, con qué texto y qué se puede
 * demostrar después.
 *
 * Este archivo es la fuente única del TEXTO que se muestra. No es un detalle
 * de presentación: la Ley 1581 de 2012 (art. 9) exige que la autorización se
 * obtenga «por cualquier medio que pueda ser objeto de consulta posterior» y
 * su art. 17, lit. b) obliga a conservar copia de la autorización otorgada.
 * El art. 12 de la Ley 527 de 1999 dice cuándo un mensaje de datos satisface
 * un deber de conservación: que la información sea accesible, que se
 * conserve en un formato que reproduzca con exactitud lo que se generó, y
 * que se guarde el origen, el destino y la fecha y hora.
 *
 * De ahí sale el diseño: el servidor no acepta el texto que le mande el
 * navegador —lo resuelve de aquí—, guarda su identificador, su huella y el
 * texto literal, y pone la hora él mismo. Reconstruir «esta persona autorizó
 * ESTE texto» no depende entonces de que nadie se acuerde de nada.
 */

/**
 * Qué se autoriza. Hay UNO porque hay uno.
 *
 * No existe `TERMS` porque ningún flujo del sitio pide aceptar los Términos:
 * enviar una consulta no celebra un contrato, y añadir una casilla para
 * registrar un consentimiento que nadie necesita es justo lo contrario de
 * pedir solo lo necesario. No existe `MARKETING` porque MILLE no envía
 * comunicaciones comerciales ni tiene con qué enviarlas: no hay lista, ni
 * campaña, ni automatización. Añadir cualquiera de los dos es una migración
 * aditiva de una línea el día que el flujo exista.
 */
export const CONSENT_TYPES = ["data_processing"] as const;

export type ConsentType = (typeof CONSENT_TYPES)[number];

export const CONSENT_TYPE_LABELS: Readonly<Record<ConsentType, string>> = {
  data_processing: "Tratamiento de datos personales",
};

/**
 * Qué hizo el Titular.
 *
 * `granted` lo escribe el propio envío del formulario. `revoked` lo registra
 * el equipo cuando llega una revocatoria por el canal de atención, porque es
 * por ahí por donde llega: el sitio no tiene cuentas de usuario desde las
 * que alguien pueda revocar por su cuenta.
 *
 * No existe `denied`: sin la casilla marcada el formulario no se envía —el
 * navegador lo exige y el servidor lo vuelve a exigir—, así que nunca llega
 * una negativa que registrar. Guardar una fila «no autorizó» exigiría
 * aceptar el envío que precisamente se rechaza.
 */
export const CONSENT_ACTIONS = ["granted", "revoked"] as const;

export type ConsentAction = (typeof CONSENT_ACTIONS)[number];

export const CONSENT_ACTION_LABELS: Readonly<Record<ConsentAction, string>> = {
  granted: "Autorizó",
  revoked: "Revocó",
};

/**
 * El texto exacto de una autorización, con su identificador de versión.
 *
 * `linkPhrase` es la parte del texto que se pinta como enlace a la política.
 * Existe para que el texto guardado y el texto visible sean el MISMO: el
 * componente no escribe su propia frase alrededor de un `<Link>`, parte esta
 * y pone el enlace en medio. Ver {@link splitConsentText}.
 */
export interface ConsentTextDefinition {
  /** `tipo@versión`. Es lo que queda guardado en el evento. */
  id: string;
  consentType: ConsentType;
  text: string;
  linkPhrase: string;
  linkHref: string;
}

/**
 * La autorización que se pide en los formularios públicos.
 *
 * Dice las finalidades CONCRETAS —el art. 5 del Decreto 1377 de 2013 pide
 * informar «todas las finalidades específicas del Tratamiento para las
 * cuales se obtiene el consentimiento», no una referencia genérica— y enlaza
 * la política, donde están los derechos y el procedimiento. No es «acepto la
 * política de privacidad»: aceptar un documento no es autorizar un
 * tratamiento, y era eso lo que había que corregir.
 */
export const DATA_PROCESSING_CONSENT: ConsentTextDefinition = {
  id: `data_processing@${LEGAL_VERSIONS.privacy}`,
  consentType: "data_processing",
  text:
    "Autorizo a MILLE Motor Culture el tratamiento de mis datos personales " +
    "para recibir, revisar y responder esta solicitud, identificar el " +
    "vehículo por el que pregunto y coordinar una visita si la pido, " +
    "conforme a la Política de Tratamiento de Datos Personales. Conozco mis " +
    "derechos como titular y cómo ejercerlos.",
  linkPhrase: "Política de Tratamiento de Datos Personales",
  linkHref: LEGAL_PATHS.privacy,
};

export const CONSENT_TEXTS: Readonly<Record<ConsentType, ConsentTextDefinition>> = {
  data_processing: DATA_PROCESSING_CONSENT,
};

/**
 * El texto partido en tres para pintarlo con el enlace dentro.
 *
 * Concatenar las tres piezas devuelve el texto original: es lo que garantiza
 * que lo que se guarda como prueba es lo que la persona leyó. Si la frase
 * del enlace no apareciera —porque alguien editó el texto y se olvidó de
 * `linkPhrase`—, devuelve el texto entero sin enlace en vez de romper el
 * formulario o, peor, enseñar algo distinto de lo que se guarda.
 */
export function splitConsentText(definition: ConsentTextDefinition): {
  before: string;
  link: string | null;
  after: string;
} {
  const at = definition.text.indexOf(definition.linkPhrase);
  if (at === -1) return { before: definition.text, link: null, after: "" };
  return {
    before: definition.text.slice(0, at),
    link: definition.linkPhrase,
    after: definition.text.slice(at + definition.linkPhrase.length),
  };
}

/**
 * De dónde salió la decisión.
 *
 * Los dos primeros son los formularios públicos; `admin` es una revocatoria
 * que llegó por el canal de atención y que el equipo deja registrada. Las
 * fichas usan `vehiculo:<slug>`, que es la forma que ya tenía `Inquiry.source`
 * y la que los filtros del Admin saben leer.
 */
export const CONSENT_SOURCE_CONTACT = "contacto";
export const CONSENT_SOURCE_ADMIN = "admin";

export function vehicleConsentSource(slug: string): string {
  return `vehiculo:${slug}`;
}

/** Cómo se lee un origen en pantalla. */
export function consentSourceLabel(source: string): string {
  if (source === CONSENT_SOURCE_CONTACT) return "Formulario de contacto";
  if (source === CONSENT_SOURCE_ADMIN) return "Registrado por el equipo";
  if (source.startsWith("vehiculo:")) {
    return `Ficha de vehículo (${source.slice("vehiculo:".length)})`;
  }
  return source;
}
