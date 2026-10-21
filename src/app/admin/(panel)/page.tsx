import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import {
  AttentionList,
  InventoryOverview,
  RecentInquiries,
  WhatsappInterest,
  attentionItems,
} from "@/components/admin/DashboardBlocks";
import { ButtonLink } from "@/components/ui/Button";
import { legalIdentityGaps } from "@/lib/legal";
import { listInquiries } from "@/server/inquiries/service";
import { adminInquiryQuerySchema } from "@/server/inquiries/schemas";
import { getPrivacyRequestSummary } from "@/server/privacy/service";
import { getInventoryStats } from "@/server/vehicles/service";
import { getWhatsappClickStats } from "@/server/whatsapp/service";

export const metadata = { title: "Panel" };

const todayFormatter = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Bogota",
});

/**
 * El Panel: qué hay que atender hoy y cómo va el negocio.
 *
 * Componente de servidor: lee la base directamente. Lo que se ve aquí es el
 * estado real, no una copia en memoria del navegador. No lista vehículos —eso
 * es Vehículos—: lista lo que está esperando a alguien.
 */
export default async function AdminDashboardPage() {
  const [stats, privacy, whatsapp, recent] = await Promise.all([
    getInventoryStats(),
    getPrivacyRequestSummary(),
    getWhatsappClickStats(),
    listInquiries(
      adminInquiryQuerySchema.parse({ view: "activas", limit: 5, page: 1 }),
    ),
  ]);

  const items = attentionItems({
    stats,
    privacy,
    legalGaps: legalIdentityGaps().length,
  });

  const today = todayFormatter.format(new Date());

  return (
    <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader
        title="Panel"
        // «martes, 20 de octubre»: la primera letra, en mayúscula.
        subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
        action={
          <ButtonLink href="/admin/vehiculos/nuevo" size="sm">
            <Plus aria-hidden className="size-4" strokeWidth={1.8} />
            Nuevo vehículo
          </ButtonLink>
        }
      />

      <div className="grid gap-x-6 gap-y-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-8">
          <AttentionList items={items} />
          <RecentInquiries inquiries={recent.inquiries} />
        </div>

        <div className="grid content-start gap-8">
          <InventoryOverview stats={stats} />
          {/* `null` si el conteo no se puede leer (p. ej. la migración todavía
              no se aplicó): el bloque se esconde, el resto del Panel no. */}
          {whatsapp ? <WhatsappInterest stats={whatsapp} /> : null}
        </div>
      </div>
    </div>
  );
}
