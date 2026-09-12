import "server-only";

import { prisma } from "@/server/db/prisma";
import { notFound } from "@/server/http/errors";
import { vehicleTitle } from "@/lib/format";
import type {
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

type InquiryRecord = Awaited<
  ReturnType<typeof prisma.inquiry.findFirstOrThrow<{
    include: { vehicle: { select: { slug: true } } };
  }>>
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
    include: { vehicle: { select: { slug: true } } },
  });

  return { inquiry: toInquiryDto(record), discarded: false };
}

export async function listInquiries(options: {
  status?: InquiryStatus;
  limit?: number;
  page?: number;
} = {}): Promise<{ inquiries: Inquiry[]; total: number }> {
  const limit = options.limit ?? 100;
  const page = options.page ?? 1;
  const where = options.status ? { status: toDbStatus[options.status] } : {};

  const [records, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      include: { vehicle: { select: { slug: true } } },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.inquiry.count({ where }),
  ]);

  return { inquiries: records.map(toInquiryDto), total };
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
      include: { vehicle: { select: { slug: true } } },
    });
    return toInquiryDto(record);
  } catch {
    throw notFound("Esa solicitud no existe.");
  }
}
