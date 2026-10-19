import Link from "next/link";
import { ArrowRight, Plus, ShieldAlert } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { StatCards } from "@/components/admin/StatCards";
import { VehicleTable } from "@/components/admin/VehicleTable";
import { WhatsappStats } from "@/components/admin/WhatsappStats";
import { ButtonLink } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";
import { adminVehicleQuerySchema } from "@/server/vehicles/schemas";
import { getInventoryStats, listAdminVehicles } from "@/server/vehicles/service";
import { getWhatsappClickStats } from "@/server/whatsapp/service";
import { getPrivacyRequestSummary } from "@/server/privacy/service";

export const metadata = { title: "Dashboard" };

/**
 * Componente de servidor: lee la base directamente. Lo que se ve aquí es el
 * estado real del inventario, no una copia en memoria del navegador.
 */
export default async function AdminDashboardPage() {
  const [stats, recent, whatsapp, privacy] = await Promise.all([
    getInventoryStats(),
    listAdminVehicles(adminVehicleQuerySchema.parse({ limit: 5, page: 1 })),
    getWhatsappClickStats(),
    getPrivacyRequestSummary(),
  ]);

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <AdminPageHeader
        title="Dashboard"
        subtitle="Resumen de tu inventario"
        action={
          <div className="flex items-center gap-5">
            <p className="hidden font-serif text-sm text-ink-muted sm:block">
              {formatDate(new Date().toISOString())}
            </p>
            <ButtonLink href="/admin/vehiculos/nuevo" size="sm">
              <Plus aria-hidden className="size-3.5" strokeWidth={1.6} />
              Nuevo vehículo
            </ButtonLink>
          </div>
        }
      />

      {/* Un plazo legal corriendo se dice aquí y no en la pantalla donde hay
          que entrar a buscarlo. Solo aparece cuando hay algo abierto: un
          aviso permanente que casi siempre dice «cero» deja de leerse. */}
      {privacy.open > 0 ? (
        <Link
          href="/admin/privacidad"
          className={
            privacy.overdue > 0
              ? "mb-6 flex items-center gap-3 border border-status-sold/30 bg-status-sold/10 px-5 py-4 font-serif text-sm text-status-sold transition-colors hover:border-status-sold/60"
              : "mb-6 flex items-center gap-3 border border-stone bg-sand/60 px-5 py-4 font-serif text-sm text-ink-soft transition-colors hover:border-ink/30"
          }
        >
          <ShieldAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.6} />
          <span>
            {privacy.overdue > 0 ? (
              <>
                <span className="tabular">{privacy.overdue}</span>{" "}
                {privacy.overdue === 1
                  ? "solicitud de privacidad VENCIDA"
                  : "solicitudes de privacidad VENCIDAS"}
                {" "}de <span className="tabular">{privacy.open}</span> abiertas.
              </>
            ) : (
              <>
                <span className="tabular">{privacy.open}</span>{" "}
                {privacy.open === 1
                  ? "solicitud de privacidad abierta"
                  : "solicitudes de privacidad abiertas"}
                , dentro de plazo.
              </>
            )}
          </span>
          <ArrowRight
            aria-hidden
            strokeWidth={1.4}
            className="ml-auto size-4 shrink-0"
          />
        </Link>
      ) : null}

      <StatCards stats={stats} />

      {/* `null` si el conteo no se puede leer (p. ej. la migración todavía no
          se aplicó): la sección se esconde, el resumen del inventario no. */}
      {whatsapp ? <WhatsappStats stats={whatsapp} /> : null}

      <div className="mt-12">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl text-ink">Vehículos recientes</h2>
          <Link
            href="/admin/vehiculos"
            className="label-caps group inline-flex items-center gap-2 text-ink-muted transition-colors hover:text-burgundy"
          >
            Ver todos
            <ArrowRight
              aria-hidden
              strokeWidth={1.3}
              className="size-3.5 transition-transform group-hover:translate-x-1"
            />
          </Link>
        </div>
        <VehicleTable vehicles={recent.vehicles} />
      </div>
    </div>
  );
}
