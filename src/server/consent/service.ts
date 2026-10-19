import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type {
  ConsentAction as DbConsentAction,
  ConsentType as DbConsentType,
} from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";
import { notFound } from "@/server/http/errors";
import { consentEvidenceFor } from "@/server/consent/evidence";
import {
  clientIp,
  clientUserAgent,
  requestId,
} from "@/server/http/client-ip";
import { LEGAL_VERSIONS } from "@/lib/legal";
import type { ConsentAction, ConsentType } from "@/lib/consent";
import type { AdminConsentQuery } from "@/server/consent/schemas";
import type { ConsentEventView } from "@/types/consent";

/**
 * La evidencia de consentimiento: escribirla y leerla.
 *
 * Escribir es insertar, nunca actualizar. La tabla lo impone con un trigger,
 * así que esto no es una convención que haya que recordar: un UPDATE desde
 * aquí fallaría igual que desde cualquier otro sitio.
 */

const toDbType: Record<ConsentType, DbConsentType> = {
  data_processing: "DATA_PROCESSING",
};

const fromDbType: Record<DbConsentType, ConsentType> = {
  DATA_PROCESSING: "data_processing",
};

const toDbAction: Record<ConsentAction, DbConsentAction> = {
  granted: "GRANTED",
  revoked: "REVOKED",
};

const fromDbAction: Record<DbConsentAction, ConsentAction> = {
  GRANTED: "granted",
  REVOKED: "revoked",
};

/**
 * Todo lo que el servidor averigua por su cuenta de una petición.
 *
 * Va junto porque se obtiene junto y porque así ningún sitio puede escribir
 * un evento «a mano» olvidándose de la mitad.
 */
export interface RequestEvidence {
  ipAddress: string | null;
  ipSource: string | null;
  userAgent: string | null;
  requestId: string | null;
}

export function requestEvidence(request: Request): RequestEvidence {
  const ip = clientIp(request);
  return {
    ipAddress: ip.address,
    ipSource: ip.header,
    userAgent: clientUserAgent(request),
    requestId: requestId(request),
  };
}

/** Lo que hace falta para registrar una decisión del Titular. */
export interface ConsentEventInput {
  consentType: ConsentType;
  action: ConsentAction;
  source: string;
  /** La solicitud a la que acompaña, cuando existe. */
  inquiryId?: string | null;
  evidence: RequestEvidence;
  metadata?: Record<string, unknown>;
}

/**
 * Los datos de un evento, con el texto resuelto por el servidor.
 *
 * Exportado y puro para poder escribirlo dentro de la MISMA transacción que
 * crea la solicitud: la autorización y el dato que autoriza tienen que
 * existir o no existir juntos. Un dato guardado sin su prueba es un dato sin
 * base, y una prueba sin su dato es una fila que no describe nada.
 */
export function consentEventData(
  input: ConsentEventInput,
): Prisma.ConsentEventUncheckedCreateInput {
  const evidence = consentEvidenceFor(input.consentType);
  return {
    consentType: toDbType[input.consentType],
    action: toDbAction[input.action],
    source: input.source,
    // La versión de la política vigente al decidir. No se recalcula al leer:
    // un evento de 2026 sigue apuntando a la política de 2026 aunque hoy
    // haya otra, que es justo lo que permite saber qué aceptó cada persona.
    policyVersion: LEGAL_VERSIONS.privacy,
    ...evidence,
    inquiryId: input.inquiryId ?? null,
    ipAddress: input.evidence.ipAddress,
    ipSource: input.evidence.ipSource,
    userAgent: input.evidence.userAgent,
    requestId: input.evidence.requestId,
    metadata: input.metadata
      ? (JSON.parse(JSON.stringify(input.metadata)) as Prisma.InputJsonValue)
      : undefined,
  };
}

/**
 * Registra una decisión del Titular fuera de una transacción ajena.
 *
 * Lo usa la revocatoria, que no acompaña a ninguna escritura: es un hecho
 * por sí mismo.
 */
export async function recordConsentEvent(
  input: ConsentEventInput,
): Promise<void> {
  await prisma.consentEvent.create({ data: consentEventData(input) });
}

// ---------------------------------------------------------------------------
// Lectura — solo Admin
// ---------------------------------------------------------------------------

const eventSelect = {
  id: true,
  createdAt: true,
  consentType: true,
  action: true,
  source: true,
  policyVersion: true,
  textVersion: true,
  textHash: true,
  textSnapshot: true,
  ipAddress: true,
  ipSource: true,
  userAgent: true,
  requestId: true,
  metadata: true,
  inquiryId: true,
  inquiry: { select: { name: true, email: true, phone: true, vehicleLabel: true } },
} as const;

type EventRecord = Awaited<
  ReturnType<typeof prisma.consentEvent.findFirstOrThrow<{ select: typeof eventSelect }>>
>;

function toView(record: EventRecord): ConsentEventView {
  return {
    id: record.id,
    createdAt: record.createdAt.toISOString(),
    consentType: fromDbType[record.consentType],
    action: fromDbAction[record.action],
    source: record.source,
    policyVersion: record.policyVersion,
    textVersion: record.textVersion,
    textHash: record.textHash,
    textSnapshot: record.textSnapshot,
    ipAddress: record.ipAddress,
    ipSource: record.ipSource,
    userAgent: record.userAgent,
    requestId: record.requestId,
    inquiryId: record.inquiryId,
    // El titular se lee a través de la solicitud. Cuando esta se borró el
    // enlace quedó nulo y aquí no hay a quién nombrar: el evento sigue
    // probando que hubo una autorización, sin resucitar los datos de alguien
    // que ya no está en la base.
    titular: record.inquiry
      ? {
          name: record.inquiry.name,
          email: record.inquiry.email,
          phone: record.inquiry.phone,
          vehicleLabel: record.inquiry.vehicleLabel,
        }
      : null,
    // Un evento sin huella del texto es uno de los que venían de la primera
    // forma de la prueba: se sabe que autorizó, no qué texto leyó.
    textEvidenceAvailable: record.textHash !== null,
  };
}

function eventWhere(query: AdminConsentQuery): Prisma.ConsentEventWhereInput {
  const where: Prisma.ConsentEventWhereInput = {};

  if (query.type) where.consentType = toDbType[query.type];
  if (query.action) where.action = toDbAction[query.action];
  if (query.source) where.source = query.source;

  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
      // `lt` del día siguiente y no `lte` del mismo día: un `lte` a
      // medianoche excluiría todo lo ocurrido durante el día indicado.
      ...(query.to ? { lt: new Date(`${query.to}T00:00:00.000Z`) } : {}),
    };
  }

  if (query.q) {
    where.OR = [
      { inquiry: { name: { contains: query.q, mode: "insensitive" } } },
      { inquiry: { email: { contains: query.q, mode: "insensitive" } } },
      { inquiry: { phone: { contains: query.q, mode: "insensitive" } } },
      { source: { contains: query.q, mode: "insensitive" } },
      { policyVersion: { contains: query.q, mode: "insensitive" } },
      // Por huella: es como se comprueba un evento concreto cuando alguien
      // llega preguntando por una autorización que tiene anotada.
      { textHash: { contains: query.q, mode: "insensitive" } },
      { ipAddress: { contains: query.q, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function listConsentEvents(
  query: AdminConsentQuery,
): Promise<{ events: ConsentEventView[]; total: number }> {
  const where = eventWhere(query);
  const [records, total] = await Promise.all([
    prisma.consentEvent.findMany({
      where,
      select: eventSelect,
      // El id desempata para que la paginación sea estable con eventos
      // escritos en el mismo milisegundo, que es lo normal en un lote.
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.consentEvent.count({ where }),
  ]);
  return { events: records.map(toView), total };
}

/**
 * Todos los eventos que cumplen el filtro, sin paginar, para exportar.
 *
 * Con tope: una exportación que intente traer un millón de filas a memoria
 * se cae y no exporta nada. Veinte mil eventos son unos pocos megas de CSV y
 * cubren de sobra el volumen real; si alguna vez no bastara, el CSV avisa
 * en vez de entregar una verdad a medias en silencio.
 */
const CONSENT_EXPORT_LIMIT = 20_000;

export async function exportConsentEvents(
  query: AdminConsentQuery,
): Promise<{ events: ConsentEventView[]; total: number; truncated: boolean }> {
  const where = eventWhere(query);
  const [records, total] = await Promise.all([
    prisma.consentEvent.findMany({
      where,
      select: eventSelect,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: CONSENT_EXPORT_LIMIT,
    }),
    prisma.consentEvent.count({ where }),
  ]);
  return {
    events: records.map(toView),
    total,
    truncated: total > records.length,
  };
}

/** Los orígenes que existen de verdad, para poder ofrecerlos como filtro. */
export async function listConsentSources(): Promise<string[]> {
  const rows = await prisma.consentEvent.findMany({
    distinct: ["source"],
    select: { source: true },
    orderBy: { source: "asc" },
  });
  return rows.map((row) => row.source);
}

export async function countConsentEvents(): Promise<
  Record<ConsentAction, number>
> {
  const rows = await prisma.consentEvent.groupBy({
    by: ["action"],
    _count: { _all: true },
  });
  return {
    granted: rows.find((row) => row.action === "GRANTED")?._count._all ?? 0,
    revoked: rows.find((row) => row.action === "REVOKED")?._count._all ?? 0,
  };
}

/**
 * Registra la revocatoria de la autorización que acompañó a una solicitud.
 *
 * No toca el evento que dice que autorizó —no se puede, y no se debe—:
 * escribe uno nuevo. El estado vigente de esa persona es su último evento, y
 * la historia completa sigue estando entera.
 */
export async function revokeConsentForInquiry(
  inquiryId: string,
  evidence: RequestEvidence,
  registeredBy: string,
  channel: string,
): Promise<void> {
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    select: { id: true },
  });
  if (!inquiry) throw notFound("Esa solicitud no existe.");

  await recordConsentEvent({
    consentType: "data_processing",
    action: "revoked",
    source: "admin",
    inquiryId,
    evidence,
    // La revocatoria llega por el canal de atención, así que la IP de la
    // petición es la del equipo y no la del titular. Decirlo aquí evita que
    // alguien la lea mañana como si fuera la del titular.
    metadata: {
      registeredBy,
      channel,
      ipBelongsTo: "admin",
    },
  });
}
