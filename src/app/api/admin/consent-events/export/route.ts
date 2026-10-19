import { NextRequest } from "next/server";
import { requireSuperadmin } from "@/server/auth/session";
import { recordAudit } from "@/server/audit/log";
import { fail } from "@/server/http/respond";
import { csvFilename } from "@/lib/csv";
import { adminConsentQuerySchema } from "@/server/consent/schemas";
import { consentCsv } from "@/server/consent/export";
import { exportConsentEvents } from "@/server/consent/service";

/**
 * La evidencia de consentimiento, en CSV.
 *
 * Es lo que se le entrega a un abogado o a la SIC. El contenido y el mapeo de
 * columnas viven en `server/consent/export`, que sí se puede comprobar en una
 * prueba; aquí solo queda la autorización, la auditoría y las cabeceras.
 *
 * No hay PDF y no hace falta: lo que tiene que ser verificable es el
 * contenido, y un CSV se abre, se busca y se compara. Un PDF solo añade una
 * capa de maquetación entre la prueba y quien la mira.
 *
 * Exportar queda registrado en la auditoría CON EL FILTRO usado. Sacar IPs y
 * datos de contacto del panel es exactamente el tipo de acción de la que hay
 * que poder rendir cuentas, y «se exportó algo» sin saber qué no sirve.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSuperadmin();
    const query = adminConsentQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    const { events, total, truncated } = await exportConsentEvents(query);

    await recordAudit(session, "EXPORT_CONSENT_EVENTS", "ConsentEvent", null, {
      exported: events.length,
      matching: total,
      truncated,
      filters: {
        type: query.type ?? null,
        action: query.action ?? null,
        source: query.source ?? null,
        from: query.from ?? null,
        to: query.to ?? null,
        q: query.q ?? null,
      },
    });

    return new Response(consentCsv(events), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename("mille-consentimientos")}"`,
        // Evidencia con IPs dentro: ni el navegador ni ningún intermediario
        // deben guardarse una copia.
        "Cache-Control": "no-store",
        // Si el tope de exportación recortó el resultado, se dice en una
        // cabecera y en la auditoría. Entregar la mitad en silencio sería
        // entregar una verdad a medias.
        ...(truncated ? { "X-Mille-Export-Truncated": String(total) } : {}),
      },
    });
  } catch (error) {
    return fail(error, "GET /api/admin/consent-events/export");
  }
}
