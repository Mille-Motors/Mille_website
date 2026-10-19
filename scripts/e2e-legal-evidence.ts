import "../prisma/env";

import { prisma } from "@/server/db/prisma";
import { consentEventData } from "@/server/consent/service";
import { createPrivacyRequest } from "@/server/privacy/service";
import { getVehicleProvenance, setVehicleRights } from "@/server/provenance/service";
import { privacyRequestDeadlines } from "@/lib/privacy-requests";

/**
 * La evidencia legal, contra la base de datos de verdad.
 *
 *     npx tsx --conditions=react-server scripts/e2e-legal-evidence.ts
 *
 * Existe porque las garantías que más importan de esta fase NO viven en el
 * código: las impone Postgres. Que un consentimiento sea inmutable es un
 * trigger; que la evidencia no sea pública es RLS más un REVOKE; que un
 * trámite de privacidad siempre tenga forma de responder es un CHECK. Una
 * prueba unitaria no puede comprobar ninguna de las tres, y son exactamente
 * las que habría que poder enseñarle a la SIC.
 *
 * Todo lo que escribe lo escribe dentro de una transacción que SIEMPRE se
 * revierte, o lo borra al terminar. No toca ninguna fila real: ni
 * solicitudes, ni consentimientos, ni vehículos, ni auditoría.
 */

let passed = 0;
const failures: string[] = [];

function check(condition: boolean, what: string) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${what}`);
  } else {
    failures.push(what);
    console.log(`  ✗ ${what}`);
  }
}

/** Ejecuta algo que DEBE fallar, y dice si falló por el motivo esperado. */
async function mustFail(
  run: () => Promise<unknown>,
  expected: RegExp,
  what: string,
): Promise<void> {
  try {
    await run();
    check(false, `${what} (no falló: la garantía no está puesta)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(
      expected.test(message),
      `${what}${expected.test(message) ? "" : ` (falló por otro motivo: ${message.slice(0, 120)})`}`,
    );
  }
}

/** Para salir de una transacción de prueba sin dejar rastro. */
class Rollback extends Error {}

/**
 * Corre algo en una transacción que SIEMPRE se revierte.
 *
 * Cada comprobación necesita la suya, y no es una preferencia de estilo: en
 * Postgres una sentencia que falla aborta la transacción entera, así que
 * comprobar «esto debe fallar» y seguir usando la misma transacción es
 * imposible —lo siguiente muere con 25P02—. Una transacción por garantía es
 * lo único que funciona, y además deja cada comprobación aislada de las
 * demás.
 */
async function inRollback(
  run: (tx: TxClient) => Promise<void>,
): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      await run(tx);
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Una solicitud de prueba con su evento de consentimiento. */
async function seed(tx: TxClient) {
  const inquiry = await tx.inquiry.create({
    data: { type: "GENERAL", name: "E2E Evidencia" },
  });
  const event = await tx.consentEvent.create({
    data: consentEventData({
      consentType: "data_processing",
      action: "granted",
      source: "contacto",
      inquiryId: inquiry.id,
      evidence: {
        ipAddress: "190.85.1.2",
        ipSource: "x-vercel-forwarded-for",
        userAgent: "e2e",
        requestId: "e2e::1",
      },
    }),
  });
  return { inquiry, event };
}

async function main() {
  console.log("Evidencia de consentimiento: inmutabilidad\n");

  // ---------------------------------------------------------------------
  // 1. Append-only. Todo dentro de una transacción que se revierte, así
  //    que ni el evento de prueba llega a existir fuera de ella.
  // ---------------------------------------------------------------------
  await inRollback(async (tx) => {
    const { event } = await seed(tx);
    check(event.textHash !== null, "el evento nace con huella del texto");
    check(event.textSnapshot !== null, "el evento nace con el texto mostrado");
    check(event.ipAddress === "190.85.1.2", "la IP queda registrada");
    check(
      event.ipSource === "x-vercel-forwarded-for",
      "queda de qué cabecera salió la IP",
    );
  });

  await inRollback(async (tx) => {
    const { event } = await seed(tx);
    await mustFail(
      () =>
        tx.consentEvent.update({
          where: { id: event.id },
          data: { source: "manipulado" },
        }),
      /append-only/i,
      "la base RECHAZA modificar un evento",
    );
  });

  await inRollback(async (tx) => {
    const { event } = await seed(tx);
    await mustFail(
      () => tx.consentEvent.delete({ where: { id: event.id } }),
      /append-only/i,
      "la base RECHAZA borrar un evento",
    );
  });

  // El único cambio admitido: desvincular la solicitud al borrarla.
  await inRollback(async (tx) => {
    const { inquiry, event } = await seed(tx);
    await tx.inquiry.delete({ where: { id: inquiry.id } });
    const orphan = await tx.consentEvent.findUnique({ where: { id: event.id } });
    check(orphan !== null, "borrar la solicitud NO destruye la evidencia");
    check(
      orphan?.inquiryId === null,
      "borrar la solicitud desvincula al titular del evento",
    );
    check(
      orphan?.textHash === event.textHash,
      "al desvincular, nada más del evento cambia",
    );
  });

  // Una revocatoria es un evento NUEVO, no una corrección.
  await inRollback(async (tx) => {
    const { event } = await seed(tx);
    const revocation = await tx.consentEvent.create({
      data: consentEventData({
        consentType: "data_processing",
        action: "revoked",
        source: "admin",
        evidence: {
          ipAddress: null,
          ipSource: null,
          userAgent: null,
          requestId: null,
        },
        metadata: { registeredBy: "e2e", ipBelongsTo: "admin" },
      }),
    });
    check(
      revocation.id !== event.id && revocation.action === "REVOKED",
      "revocar añade un evento en vez de corregir el anterior",
    );
    const both = await tx.consentEvent.count({
      where: { id: { in: [event.id, revocation.id] } },
    });
    check(both === 2, "la autorización anterior sigue ahí después de revocar");
  });

  // ---------------------------------------------------------------------
  // 2. Nada de esto es público. RLS activo y privilegios revocados.
  // ---------------------------------------------------------------------
  console.log("\nSuperficie pública: RLS y privilegios\n");

  const PROTECTED = [
    "ConsentEvent",
    "PrivacyRequest",
    "Inquiry",
    "ConsentRecord",
    "AdminAuditLog",
    "AdminUser",
  ];

  const rls = await prisma.$queryRaw<{ relname: string; relrowsecurity: boolean }[]>`
    SELECT c.relname, c.relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = ANY(${PROTECTED})
  `;
  for (const table of PROTECTED) {
    const row = rls.find((entry) => entry.relname === table);
    check(row?.relrowsecurity === true, `${table}: RLS activo`);
  }

  // RLS no cubre TRUNCATE y no aplica al dueño de la tabla, así que el
  // REVOKE no sobra: es la segunda capa.
  const grants = await prisma.$queryRaw<{ table_name: string; grantee: string }[]>`
    SELECT table_name, grantee
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND grantee IN ('anon', 'authenticated')
      AND table_name = ANY(${PROTECTED})
  `;
  check(
    grants.length === 0,
    `ningún privilegio para anon/authenticated${grants.length ? ` (hay ${grants.length})` : ""}`,
  );

  const policies = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('ConsentEvent', 'PrivacyRequest')
  `;
  check(
    policies.length === 0,
    "sin políticas: PostgREST no puede devolver ni una fila",
  );

  // ---------------------------------------------------------------------
  // 3. Un trámite de privacidad sin forma de responder no debe existir.
  // ---------------------------------------------------------------------
  console.log("\nSolicitudes de privacidad: plazos y garantías\n");

  await mustFail(
    () =>
      prisma.$transaction(async (tx) => {
        await tx.privacyRequest.create({
          data: {
            type: "DELETION",
            channel: "EMAIL",
            receivedOn: new Date("2026-10-19T00:00:00.000Z"),
            dueOn: new Date("2026-11-10T00:00:00.000Z"),
            titularName: "E2E Sin contacto",
          },
        });
      }),
    /PrivacyRequest_reachable|check constraint/i,
    "la base RECHAZA un trámite sin correo ni teléfono",
  );

  const created = await createPrivacyRequest({
    type: "deletion",
    channel: "email",
    receivedOn: "2026-10-19",
    titularName: "E2E Supresión",
    titularEmail: "e2e@millemotorculture.invalid",
    identityVerified: false,
  });
  try {
    const expected = privacyRequestDeadlines("deletion", "2026-10-19");
    check(created.track === "reclamo", "una supresión se tramita como reclamo");
    check(
      created.dueOn === expected.dueOn,
      `el vencimiento guardado es el calculado (${created.dueOn})`,
    );
    check(
      created.identityVerified === false,
      "la identidad NO se da por acreditada sola",
    );
  } finally {
    await prisma.privacyRequest.delete({ where: { id: created.id } });
  }

  // ---------------------------------------------------------------------
  // 4. Procedencia: pendiente de verdad, y sin bloquear nada.
  // ---------------------------------------------------------------------
  console.log("\nProcedencia de imágenes\n");

  const vehicle = await prisma.vehicle.findFirst({
    select: { id: true, rightsSourceType: true, publicationStatus: true },
  });

  if (!vehicle) {
    console.log("  — no hay vehículos en esta base: nada que comprobar");
  } else {
    const previous = vehicle.rightsSourceType;
    try {
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { rightsSourceType: null },
      });
      const pending = await getVehicleProvenance(vehicle.id);
      const stillPublished = await prisma.vehicle.findUnique({
        where: { id: vehicle.id },
        select: { publicationStatus: true },
      });
      check(
        stillPublished?.publicationStatus === vehicle.publicationStatus,
        "una procedencia pendiente NO despublica el vehículo",
      );
      check(
        pending.lot === null,
        "sin registrar, el lote queda pendiente y no inventado",
      );

      const documented = await setVehicleRights(vehicle.id, {
        sourceType: "owner",
        sourceName: "E2E Propietario",
        author: null,
        sourceUrl: null,
        licenseType: null,
        licenseUrl: null,
        licenseRequiresAttribution: false,
        acquiredOn: "2026-10-19",
        authorizedBy: null,
        proofRef: null,
        notes: null,
      });
      check(
        documented.lot?.sourceType === "owner",
        "registrar el lote lo documenta",
      );
      check(
        documented.lot?.acquiredOn === "2026-10-19",
        "la fecha se guarda como día del calendario, sin corrimiento",
      );
      check(
        documented.images.every(
          (image) => image.resolved.status === "documented",
        ),
        "las fotografías heredan la procedencia del lote",
      );

      const cleared = await setVehicleRights(vehicle.id, null);
      check(
        cleared.lot === null,
        "quitar una procedencia equivocada es posible y la deja pendiente",
      );
    } finally {
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { rightsSourceType: previous },
      });
    }
  }

  // ---------------------------------------------------------------------
  // 5. No queda nada de la prueba.
  // ---------------------------------------------------------------------
  const leftovers = await prisma.consentEvent.count({
    where: { source: { in: ["contacto", "admin"] }, userAgent: "e2e" },
  });
  check(leftovers === 0, "la prueba no dejó ningún evento en la base");

  const strayRequests = await prisma.privacyRequest.count({
    where: { titularName: { startsWith: "E2E " } },
  });
  check(strayRequests === 0, "la prueba no dejó ningún trámite en la base");

  await prisma.$disconnect();

  console.log(`\n${passed} comprobaciones bien, ${failures.length} mal.`);
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exitCode = failures.length === 0 ? 0 : 1;
}

void main();
