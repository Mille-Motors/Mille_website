import { AdminPageHeader } from "@/components/admin/AdminShell";
import { SettingsOverview } from "@/components/admin/SettingsOverview";

export const metadata = { title: "Configuración" };

/**
 * Canales oficiales y estado de los documentos legales.
 *
 * El contenido vive en `SettingsOverview`, que no depende del marco del
 * Admin y por eso se puede comprobar en una prueba.
 */
export default function AdminSettingsPage() {
  return (
    <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <AdminPageHeader
        title="Configuración"
        subtitle="Cómo se presenta MILLE y qué falta por confirmar"
      />
      <SettingsOverview />
    </div>
  );
}
