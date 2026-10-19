import { addBusinessDays, type CivilDate } from "@/lib/colombian-holidays";

/**
 * Las solicitudes con las que un Titular ejerce sus derechos.
 *
 * Es una bandeja aparte de `Inquiry` a propósito. «Quiero vender mi Porsche»
 * y «quiero que eliminen mis datos» llegan por el mismo WhatsApp, pero no
 * son lo mismo: una es un cliente y la otra es un derecho con un plazo
 * legal que se vence. Mezclarlas en una sola bandeja garantiza que la
 * segunda se pierda entre las primeras.
 *
 * El canal de entrada es humano —correo o WhatsApp— y eso es deliberado: el
 * art. 23 del Decreto 1377 de 2013 pide designar quién atiende las
 * solicitudes, no montar un portal. Lo que hace falta aquí es el registro
 * de lo que llegó, en qué estado está y cuándo se vence.
 */

/**
 * Qué pide el Titular.
 *
 * Son los derechos del art. 8 de la Ley 1581 de 2012, con los nombres que
 * usa la propia ley. `complaint` es el reclamo del art. 15 cuando alguien
 * considera que no se respetó un deber, que no es lo mismo que pedir una
 * corrección.
 */
export const PRIVACY_REQUEST_TYPES = [
  "access",
  "update",
  "rectification",
  "deletion",
  "revocation",
  "proof_of_consent",
  "use_information",
  "complaint",
  "other",
] as const;

export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];

export const PRIVACY_REQUEST_TYPE_LABELS: Readonly<
  Record<PrivacyRequestType, string>
> = {
  access: "Conocer y acceder a sus datos",
  update: "Actualizar sus datos",
  rectification: "Rectificar sus datos",
  deletion: "Suprimir sus datos",
  revocation: "Revocar la autorización",
  proof_of_consent: "Prueba de la autorización",
  use_information: "Información sobre el uso de sus datos",
  complaint: "Reclamo",
  other: "Otra solicitud",
};

/**
 * Consulta o reclamo. De esto depende el plazo, y por eso no es un campo que
 * alguien rellene a mano: se deduce del tipo de solicitud.
 *
 * El art. 14 de la Ley 1581 trata como CONSULTA el acceso a la información y
 * el art. 15 como RECLAMO la corrección, actualización o supresión y el
 * presunto incumplimiento de un deber. El art. 9 del Decreto 1377 de 2013
 * añade que la revocatoria y la supresión se piden «mediante la presentación
 * de un reclamo», así que van por la vía del art. 15.
 *
 * `other` se cuenta como consulta, que es el plazo más CORTO: ante la duda
 * se responde antes, no después.
 */
export type PrivacyRequestTrack = "consulta" | "reclamo";

const TRACK_BY_TYPE: Readonly<Record<PrivacyRequestType, PrivacyRequestTrack>> = {
  access: "consulta",
  proof_of_consent: "consulta",
  use_information: "consulta",
  other: "consulta",
  update: "reclamo",
  rectification: "reclamo",
  deletion: "reclamo",
  revocation: "reclamo",
  complaint: "reclamo",
};

export function trackForType(type: PrivacyRequestType): PrivacyRequestTrack {
  return TRACK_BY_TYPE[type];
}

/**
 * Los plazos, en días hábiles, tal como están en la ley.
 *
 * `base` es el término máximo para atender; `extension`, lo que como máximo
 * puede durar la prórroga cuando se informa el motivo de la demora. Son
 * máximos legales, no objetivos internos, y por eso se citan con su
 * artículo: si alguien quiere cambiarlos tiene que cambiar la ley primero.
 */
export const PRIVACY_REQUEST_TERMS: Readonly<
  Record<PrivacyRequestTrack, { base: number; extension: number; article: string }>
> = {
  consulta: { base: 10, extension: 5, article: "art. 14 de la Ley 1581 de 2012" },
  reclamo: { base: 15, extension: 8, article: "art. 15 de la Ley 1581 de 2012" },
};

/**
 * Cuándo se vence el plazo de una solicitud recibida en una fecha.
 *
 * Se cuenta en días hábiles colombianos desde el día siguiente al de recibo,
 * que es lo que dicen los dos artículos. Devuelve también la fecha límite de
 * la prórroga, porque es la que importa cuando ya se informó la demora.
 */
export function privacyRequestDeadlines(
  type: PrivacyRequestType,
  receivedOn: CivilDate,
): { track: PrivacyRequestTrack; dueOn: CivilDate; extendedDueOn: CivilDate } {
  const track = trackForType(type);
  const term = PRIVACY_REQUEST_TERMS[track];
  const dueOn = addBusinessDays(receivedOn, term.base);
  return {
    track,
    dueOn,
    extendedDueOn: addBusinessDays(dueOn, term.extension),
  };
}

/**
 * En qué va la solicitud.
 *
 * `needs_info` es el requerimiento del art. 15, num. 1: un reclamo
 * incompleto se devuelve al interesado para que lo subsane. `rejected` es
 * para lo que no procede —una supresión que choca con un deber legal de
 * conservación—, y existe porque cerrar eso como «atendida» escondería que
 * se negó y por qué.
 */
export const PRIVACY_REQUEST_STATUSES = [
  "received",
  "in_progress",
  "needs_info",
  "answered",
  "rejected",
  "closed",
] as const;

export type PrivacyRequestStatus = (typeof PRIVACY_REQUEST_STATUSES)[number];

export const PRIVACY_REQUEST_STATUS_LABELS: Readonly<
  Record<PrivacyRequestStatus, string>
> = {
  received: "Recibida",
  in_progress: "En trámite",
  needs_info: "Pendiente del titular",
  answered: "Atendida",
  rejected: "No procede",
  closed: "Cerrada",
};

/** Los estados en los que el plazo sigue corriendo. */
export const OPEN_PRIVACY_STATUSES: readonly PrivacyRequestStatus[] = [
  "received",
  "in_progress",
  "needs_info",
];

export function isOpenPrivacyStatus(status: PrivacyRequestStatus): boolean {
  return OPEN_PRIVACY_STATUSES.includes(status);
}

/** Por dónde llegó. */
export const PRIVACY_REQUEST_CHANNELS = ["email", "whatsapp", "other"] as const;

export type PrivacyRequestChannel = (typeof PRIVACY_REQUEST_CHANNELS)[number];

export const PRIVACY_REQUEST_CHANNEL_LABELS: Readonly<
  Record<PrivacyRequestChannel, string>
> = {
  email: "Correo electrónico",
  whatsapp: "WhatsApp",
  other: "Otro canal",
};

/**
 * Cuántos días hábiles quedan —o cuántos van de retraso— para una solicitud
 * abierta. Negativo significa vencida.
 *
 * Se calcula contando hábiles hacia delante desde hoy hasta el vencimiento,
 * que es más honesto que restar días de calendario: lo que se vence es un
 * plazo hábil.
 */
export function businessDaysUntil(due: CivilDate, today: CivilDate): number {
  if (due === today) return 0;
  const forward = due > today;
  const [from, to] = forward ? [today, due] : [due, today];
  let count = 0;
  let cursor = from;
  while (cursor < to) {
    cursor = addBusinessDays(cursor, 1);
    count += 1;
  }
  return forward ? count : -count;
}
