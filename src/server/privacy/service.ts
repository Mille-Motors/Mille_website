import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type {
  PrivacyRequestChannel as DbChannel,
  PrivacyRequestStatus as DbStatus,
  PrivacyRequestType as DbType,
} from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";
import { notFound } from "@/server/http/errors";
import { toCivilDate } from "@/lib/colombian-holidays";
import {
  businessDaysUntil,
  isOpenPrivacyStatus,
  privacyRequestDeadlines,
  trackForType,
  type PrivacyRequestChannel,
  type PrivacyRequestStatus,
  type PrivacyRequestType,
} from "@/lib/privacy-requests";
import type {
  AdminPrivacyQuery,
  PrivacyRequestCreateInput,
  PrivacyRequestPatchInput,
} from "@/server/privacy/schemas";
import type { PrivacyRequestView } from "@/types/privacy";

/**
 * El expediente de las solicitudes con las que un Titular ejerce sus
 * derechos: registrarlas, atenderlas y cerrarlas.
 *
 * A diferencia de `ConsentEvent`, esto SÍ se edita: es el estado de un
 * trámite, no la evidencia de una decisión. Lo que no se pierde es quién lo
 * tocó, y eso vive en `AdminAuditLog`.
 */

const toDbType: Record<PrivacyRequestType, DbType> = {
  access: "ACCESS",
  update: "UPDATE",
  rectification: "RECTIFICATION",
  deletion: "DELETION",
  revocation: "REVOCATION",
  proof_of_consent: "PROOF_OF_CONSENT",
  use_information: "USE_INFORMATION",
  complaint: "COMPLAINT",
  other: "OTHER",
};

const fromDbType: Record<DbType, PrivacyRequestType> = {
  ACCESS: "access",
  UPDATE: "update",
  RECTIFICATION: "rectification",
  DELETION: "deletion",
  REVOCATION: "revocation",
  PROOF_OF_CONSENT: "proof_of_consent",
  USE_INFORMATION: "use_information",
  COMPLAINT: "complaint",
  OTHER: "other",
};

const toDbStatus: Record<PrivacyRequestStatus, DbStatus> = {
  received: "RECEIVED",
  in_progress: "IN_PROGRESS",
  needs_info: "NEEDS_INFO",
  answered: "ANSWERED",
  rejected: "REJECTED",
  closed: "CLOSED",
};

const fromDbStatus: Record<DbStatus, PrivacyRequestStatus> = {
  RECEIVED: "received",
  IN_PROGRESS: "in_progress",
  NEEDS_INFO: "needs_info",
  ANSWERED: "answered",
  REJECTED: "rejected",
  CLOSED: "closed",
};

const toDbChannel: Record<PrivacyRequestChannel, DbChannel> = {
  email: "EMAIL",
  whatsapp: "WHATSAPP",
  other: "OTHER",
};

const fromDbChannel: Record<DbChannel, PrivacyRequestChannel> = {
  EMAIL: "email",
  WHATSAPP: "whatsapp",
  OTHER: "other",
};

type Record_ = Awaited<ReturnType<typeof prisma.privacyRequest.findFirstOrThrow>>;

/**
 * Una fecha `@db.Date` de vuelta a su día del calendario.
 *
 * Postgres la devuelve como medianoche UTC, así que recortar el ISO da el
 * día correcto. Formatearla con la zona local la correría al día anterior en
 * Bogotá, que es el mismo error que obliga a guardar los vencimientos del
 * SOAT como `DATE` y no como instante.
 */
const civil = (value: Date): string => value.toISOString().slice(0, 10);

function toView(record: Record_, today: string): PrivacyRequestView {
  const status = fromDbStatus[record.status];
  const dueOn = civil(record.dueOn);
  return {
    id: record.id,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    type: fromDbType[record.type],
    status,
    channel: fromDbChannel[record.channel],
    receivedOn: civil(record.receivedOn),
    dueOn,
    track: trackForType(fromDbType[record.type]),
    titularName: record.titularName,
    titularEmail: record.titularEmail,
    titularPhone: record.titularPhone,
    identityVerified: record.identityVerified,
    identityNote: record.identityNote,
    subject: record.subject,
    notes: record.notes,
    response: record.response,
    closedAt: record.closedAt?.toISOString() ?? null,
    // El plazo solo corre mientras el trámite está abierto. Seguir contando
    // días sobre uno cerrado llenaría la pantalla de rojos que ya no
    // significan nada y escondería los que sí.
    businessDaysLeft: isOpenPrivacyStatus(status)
      ? businessDaysUntil(dueOn, today)
      : null,
  };
}

/** Hoy, como día del calendario en UTC. Un solo valor por consulta. */
function today(): string {
  return toCivilDate(new Date());
}

/**
 * Registra una solicitud recibida.
 *
 * El vencimiento se CALCULA aquí y se guarda. No se recalcula al leer a
 * propósito: el plazo de un trámite ya abierto no puede moverse porque
 * mañana se corrija la tabla de festivos o porque alguien cambie la
 * clasificación de un tipo de solicitud.
 */
export async function createPrivacyRequest(
  input: PrivacyRequestCreateInput,
): Promise<PrivacyRequestView> {
  const { dueOn } = privacyRequestDeadlines(input.type, input.receivedOn);

  const record = await prisma.privacyRequest.create({
    data: {
      type: toDbType[input.type],
      channel: toDbChannel[input.channel],
      receivedOn: new Date(`${input.receivedOn}T00:00:00.000Z`),
      dueOn: new Date(`${dueOn}T00:00:00.000Z`),
      titularName: input.titularName,
      titularEmail: input.titularEmail?.toLowerCase() ?? null,
      titularPhone: input.titularPhone ?? null,
      identityVerified: input.identityVerified,
      identityNote: input.identityNote ?? null,
      subject: input.subject ?? null,
      notes: input.notes ?? null,
    },
  });

  return toView(record, today());
}

/**
 * Atiende un trámite: estado, notas, respuesta, verificación de identidad.
 *
 * `closedAt` lo pone el servidor cuando el estado pasa a uno final, y lo
 * quita si vuelve a abrirse. Dejarlo a cargo de quien llama garantizaría que
 * tarde o temprano hubiera un trámite cerrado sin fecha de cierre.
 */
export async function updatePrivacyRequest(
  id: string,
  patch: PrivacyRequestPatchInput,
): Promise<PrivacyRequestView> {
  const existing = await prisma.privacyRequest.findUnique({ where: { id } });
  if (!existing) throw notFound("Esa solicitud de privacidad no existe.");

  const nextStatus = patch.status ?? fromDbStatus[existing.status];
  const open = isOpenPrivacyStatus(nextStatus);

  const record = await prisma.privacyRequest.update({
    where: { id },
    data: {
      ...(patch.status ? { status: toDbStatus[patch.status] } : {}),
      ...(patch.identityVerified !== undefined
        ? { identityVerified: patch.identityVerified }
        : {}),
      ...(patch.identityNote !== undefined
        ? { identityNote: patch.identityNote ?? null }
        : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes ?? null } : {}),
      ...(patch.response !== undefined
        ? { response: patch.response ?? null }
        : {}),
      ...(patch.status
        ? {
            // Cerrar pone la hora; reabrir la quita. Conservar una fecha de
            // cierre en un trámite reabierto diría que se atendió cuando no.
            closedAt: open ? null : (existing.closedAt ?? new Date()),
          }
        : {}),
    },
  });

  return toView(record, today());
}

export async function getPrivacyRequest(id: string): Promise<PrivacyRequestView> {
  const record = await prisma.privacyRequest.findUnique({ where: { id } });
  if (!record) throw notFound("Esa solicitud de privacidad no existe.");
  return toView(record, today());
}

function privacyWhere(query: AdminPrivacyQuery): Prisma.PrivacyRequestWhereInput {
  const where: Prisma.PrivacyRequestWhereInput = {};

  // La bandeja acota siempre, igual que en solicitudes del público: un
  // trámite cerrado no puede seguir apareciendo entre los que corren.
  if (query.view === "abiertas") {
    where.status = { in: ["RECEIVED", "IN_PROGRESS", "NEEDS_INFO"] };
  } else if (query.view === "cerradas") {
    where.status = { in: ["ANSWERED", "REJECTED", "CLOSED"] };
  }

  // Un estado explícito afina dentro de la bandeja. Si no pertenece a ella,
  // manda la bandeja: así un enlace guardado no devuelve cero sin explicar
  // por qué.
  if (query.status) {
    const wanted = toDbStatus[query.status];
    const allowed = where.status as { in: DbStatus[] } | undefined;
    if (!allowed || allowed.in.includes(wanted)) where.status = wanted;
  }

  if (query.type) where.type = toDbType[query.type];
  if (query.channel) where.channel = toDbChannel[query.channel];

  if (query.q) {
    where.OR = [
      { titularName: { contains: query.q, mode: "insensitive" } },
      { titularEmail: { contains: query.q, mode: "insensitive" } },
      { titularPhone: { contains: query.q, mode: "insensitive" } },
      { subject: { contains: query.q, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function listPrivacyRequests(
  query: AdminPrivacyQuery,
): Promise<{ requests: PrivacyRequestView[]; total: number }> {
  const where = privacyWhere(query);
  const now = today();

  const [records, total] = await Promise.all([
    prisma.privacyRequest.findMany({
      where,
      // Lo que se vence primero, primero. En una bandeja con plazos legales
      // el orden por fecha de creación esconde lo urgente detrás de lo
      // reciente.
      orderBy: [{ dueOn: "asc" }, { createdAt: "desc" }, { id: "asc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.privacyRequest.count({ where }),
  ]);

  return { requests: records.map((record) => toView(record, now)), total };
}

/**
 * El resumen de la bandeja: cuántas abiertas y cuántas vencidas.
 *
 * Lo lee el dashboard, que es donde hace falta ver que hay un plazo corriendo
 * sin tener que entrar a buscarlo.
 */
export async function getPrivacyRequestSummary(): Promise<{
  open: number;
  overdue: number;
}> {
  const openStatuses: DbStatus[] = ["RECEIVED", "IN_PROGRESS", "NEEDS_INFO"];
  const [open, overdue] = await Promise.all([
    prisma.privacyRequest.count({ where: { status: { in: openStatuses } } }),
    prisma.privacyRequest.count({
      where: {
        status: { in: openStatuses },
        dueOn: { lt: new Date(`${today()}T00:00:00.000Z`) },
      },
    }),
  ]);
  return { open, overdue };
}
