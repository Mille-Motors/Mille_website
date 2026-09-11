import { AdminPending } from "@/components/admin/AdminPending";

export const metadata = { title: "Configuración" };

export default function AdminSettingsPage() {
  return (
    <AdminPending
      title="Configuración"
      subtitle="Datos de contacto y preferencias"
      body="El WhatsApp, el correo y las redes de MILLE se editan hoy en el archivo de configuración del sitio. Esta pantalla los abrirá cuando exista autenticación."
    />
  );
}
