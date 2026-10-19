import {
  CONSENT_ACTION_LABELS,
  CONSENT_SOURCE_ADMIN,
  CONSENT_TYPE_LABELS,
  consentSourceLabel,
} from "@/lib/consent";
import { toCsv } from "@/lib/csv";
import type { ConsentEventView } from "@/types/consent";

/**
 * La evidencia de consentimiento, en CSV.
 *
 * Está separado del route handler para poder comprobarlo: el handler importa
 * la sesión, que es `server-only`, y entonces el mapeo —que es lo que puede
 * romperse en silencio— quedaría sin pruebas. Lo que se rompe en silencio en
 * un CSV es la ALINEACIÓN: añadir una columna a la cabecera y olvidarla en la
 * fila corre todos los valores una posición, y el resultado sigue abriéndose
 * sin error en Excel con las IPs en la columna del agente de usuario.
 *
 * Lleva todo lo que hace falta para reconstruir una autorización: cuándo,
 * quién, desde qué formulario, qué versión de la política, qué texto exacto,
 * su huella y la IP con la cabecera de la que salió. Sin eso, un CSV de
 * consentimientos es una lista de nombres y fechas que no prueba nada.
 */
export const CONSENT_CSV_HEADER = [
  "id",
  "fecha_hora_utc",
  "tipo",
  "accion",
  "origen",
  "origen_legible",
  "version_politica",
  "version_texto",
  "huella_sha256_texto",
  "texto_mostrado",
  "prueba_del_texto",
  "ip",
  "ip_cabecera",
  "ip_corresponde_a",
  "agente_usuario",
  "id_peticion",
  "solicitud_id",
  "titular_nombre",
  "titular_correo",
  "titular_telefono",
  "vehiculo",
] as const;

export function consentCsvRow(event: ConsentEventView): unknown[] {
  // Una revocatoria la teclea el equipo cuando llega por correo o WhatsApp,
  // así que los datos técnicos de esa petición son suyos y no del titular.
  const registeredByTeam = event.source === CONSENT_SOURCE_ADMIN;

  return [
    event.id,
    event.createdAt,
    CONSENT_TYPE_LABELS[event.consentType],
    CONSENT_ACTION_LABELS[event.action],
    event.source,
    consentSourceLabel(event.source),
    event.policyVersion,
    event.textVersion,
    event.textHash,
    event.textSnapshot,
    // Dicho en voz alta en vez de dejar tres columnas vacías que alguien
    // podría leer como un fallo de la exportación.
    event.textEvidenceAvailable
      ? "disponible"
      : "no disponible (evento heredado)",
    event.ipAddress,
    event.ipSource,
    registeredByTeam
      ? "equipo de MILLE (registró la decisión recibida por otro canal)"
      : "titular",
    event.userAgent,
    event.requestId,
    event.inquiryId,
    event.titular?.name ?? null,
    event.titular?.email ?? null,
    event.titular?.phone ?? null,
    event.titular?.vehicleLabel ?? null,
  ];
}

export function consentCsv(events: readonly ConsentEventView[]): string {
  return toCsv(CONSENT_CSV_HEADER, events.map(consentCsvRow));
}
