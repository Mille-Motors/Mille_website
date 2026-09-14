import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import { notFound } from "@/server/http/errors";
import { vehicleTitle } from "@/lib/format";
import type {
  AdminInquiryQuery,
  InquiryInput,
} from "@/server/inquiries/schemas";
import type { InquiryStatus, InquiryType, Inquiry } from "@/types/vehicle";
import type {
  InquiryStatus as DbInquiryStatus,
  InquiryType as DbInquiryType,
} from "@/generated/prisma/enums";

const toDbType: Record<InquiryType, DbInquiryType> = {
  general: "GENERAL",
  vehicle_info: "VEHICLE_INFO",
  appointment: "APPOINTMENT",
};

const fromDbType: Record<DbInquiryType, InquiryType> = {
  GENERAL: "general",
  VEHICLE_INFO: "vehicle_info",
  APPOINTMENT: "appointment",
};

const toDbStatus: Record<InquiryStatus, DbInquiryStatus> = {
  new: "NEW",
  contacted: "CONTACTED",
  closed: "CLOSED",
  spam: "SPAM",
};

const fromDbStatus: Record<DbInquiryStatus, InquiryStatus> = {
  NEW: "new",
  CONTACTED: "contacted",
  CLOSED: "closed",
  SPAM: "spam",
};

/** Lo mínimo que hay que traer del vehículo para poder pintar una fila. */
const inquiryInclude = {
  vehicle: { select: { slug: true, vehicleType: true } },
} as const;

type InquiryRecord = Awaited<
  ReturnType<typeof prisma.inquiry.findFirstOrThrow<{ include: typeof inquiryInclude }>>
>;

function toInquiryDto(record: InquiryRecord): Inquiry {
  return {
    id: record.id,
    type: fromDbType[record.type],
    status: fromDbStatus[record.status],
    name: record.name,
    phone: record.phone,
    email: record.email,
    message: record.message,
    source: record.source,
    vehicleId: record.vehicleId,
    vehicleLabel: record.vehicleLabel,
    vehicleSlug: record.vehicle?.slug ?? null,
    vehicleType: record.vehicle
      ? record.vehicle.vehicleType === "MOTO"
        ? "moto"
        : "auto"
      : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

/**
 * Guarda una solicitud del público.
 *
 * El vehículo se resuelve por slug contra el inventario publicado: el
 * formulario no puede apuntar a un borrador ni inventarse un id. Si el slug
 * no existe, la solicitud se guarda igual sin vehículo — perder el contacto
 * de alguien por un enlace viejo sería peor que guardarlo suelto.
 *
 * El honeypot se resuelve arriba, antes de escribir nada.
 */
export async function createInquiry(
  input: InquiryInput,
): Promise<{ inquiry: Inquiry; discarded: boolean }> {
  if (input.website && input.website.trim() !== "") {
    // Un bot. Se responde como si todo hubiera ido bien, pero no se escribe
    // nada: decirle que lo detectamos solo le enseña a evitarlo.
    return {
      discarded: true,
      inquiry: {
        id: "discarded",
        type: input.type,
        status: "spam",
        name: input.name,
        phone: input.phone,
        email: input.email,
        message: input.message ?? null,
        source: input.source ?? null,
        vehicleId: null,
        vehicleLabel: null,
        vehicleSlug: null,
        vehicleType: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  let vehicleId: string | null = null;
  let vehicleLabel: string | null = null;

  if (input.vehicleSlug) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { slug: input.vehicleSlug, publicationStatus: "PUBLISHED" },
      select: { id: true, make: true, model: true, version: true, year: true },
    });
    if (vehicle) {
      vehicleId = vehicle.id;
      vehicleLabel = `${vehicleTitle(vehicle)} ${vehicle.year}`;
    }
  }

  const record = await prisma.inquiry.create({
    data: {
      type: toDbType[input.type],
      name: input.name,
      phone: input.phone,
      email: input.email.toLowerCase(),
      message: input.message?.trim() || null,
      source: input.source ?? null,
      vehicleId,
      vehicleLabel,
    },
    include: inquiryInclude,
  });

  return { inquiry: toInquiryDto(record), discarded: false };
}

/**
 * Traduce los filtros del admin a una cláusula de Prisma.
 *
 * `vehicleType` no es una columna de Inquiry: se resuelve a través de la
 * relación, que es lo que permite preguntar "¿quién ha preguntado por
 * motos?" sin desnormalizar nada.
 */
function inquiryWhere(query: AdminInquiryQuery): Prisma.InquiryWhereInput {
  const where: Prisma.InquiryWhereInput = {};

  if (query.status) where.status = toDbStatus[query.status];
  if (query.type) where.type = toDbType[query.type];

  if (query.vehicleId === "none") {
    where.vehicleId = null;
  } else if (query.vehicleId) {
    where.vehicleId = query.vehicleId;
  }

  if (query.vehicleType) {
    where.vehicle = {
      vehicleType: query.vehicleType === "moto" ? "MOTO" : "AUTO",
    };
  }

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { email: { contains: query.q, mode: "insensitive" } },
      { phone: { contains: query.q, mode: "insensitive" } },
      // vehicleLabel conserva el nombre tal como se mostraba al enviarse, así
      // que sigue encontrando solicitudes cuyo vehículo ya se borró.
      { vehicleLabel: { contains: query.q, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function listInquiries(
  query: AdminInquiryQuery,
): Promise<{ inquiries: Inquiry[]; total: number }> {
  const where = inquiryWhere(query);

  const [records, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      include: inquiryInclude,
      // El id desempata para que la paginación sea estable.
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.inquiry.count({ where }),
  ]);

  return { inquiries: records.map(toInquiryDto), total };
}

export interface InquiryVehicleOption {
  id: string;
  label: string;
  vehicleType: "auto" | "moto";
}

/**
 * Los vehículos por los que alguien ha preguntado de verdad. La lista sale de
 * las solicitudes, no del inventario: ofrecer los 300 vehículos cuando solo
 * 12 tienen solicitudes convertiría el selector en un estorbo.
 */
export async function listInquiryVehicleOptions(): Promise<
  InquiryVehicleOption[]
> {
  const rows = await prisma.inquiry.findMany({
    where: { vehicleId: { not: null } },
    distinct: ["vehicleId"],
    select: {
      vehicleId: true,
      vehicleLabel: true,
      vehicle: {
        select: { make: true, model: true, version: true, year: true, vehicleType: true },
      },
    },
  });

  return rows
    .filter((row): row is typeof row & { vehicleId: string } => row.vehicleId !== null)
    .map((row) => ({
      id: row.vehicleId,
      // Se prefiere el nombre actual del vehículo; si se archivó y ya no se
      // puede leer, queda la etiqueta guardada al enviarse la solicitud.
      label: row.vehicle
        ? `${vehicleTitle(row.vehicle)} ${row.vehicle.year}`
        : (row.vehicleLabel ?? "Vehículo retirado"),
      vehicleType: row.vehicle?.vehicleType === "MOTO" ? ("moto" as const) : ("auto" as const),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export async function countInquiriesByStatus(): Promise<
  Record<InquiryStatus, number>
> {
  const rows = await prisma.inquiry.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  return {
    new: rows.find((r) => r.status === "NEW")?._count._all ?? 0,
    contacted: rows.find((r) => r.status === "CONTACTED")?._count._all ?? 0,
    closed: rows.find((r) => r.status === "CLOSED")?._count._all ?? 0,
    spam: rows.find((r) => r.status === "SPAM")?._count._all ?? 0,
  };
}

export async function setInquiryStatus(
  id: string,
  status: InquiryStatus,
): Promise<Inquiry> {
  try {
    const record = await prisma.inquiry.update({
      where: { id },
      data: { status: toDbStatus[status] },
      include: inquiryInclude,
    });
    return toInquiryDto(record);
  } catch {
    throw notFound("Esa solicitud no existe.");
  }
}
