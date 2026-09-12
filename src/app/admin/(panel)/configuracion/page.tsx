import { AdminPending } from "@/components/admin/AdminPending";

export const metadata = { title: "Configuración" };

/**
 * Deliberadamente vacía en esta fase. El dominio oficial, el correo
 * corporativo, el WhatsApp y el Instagram de MILLE todavía no existen, y
 * abrir aquí un formulario para escribirlos invitaría a poner datos falsos
 * que el sitio público mostraría como si fueran reales.
 */
export default function AdminSettingsPage() {
  return (
    <AdminPending
      title="Configuración"
      subtitle="Canales de contacto y dominio"
      body="El dominio, el correo, el WhatsApp y el Instagram de MILLE se activarán en su propia fase, cuando existan de verdad. Hasta entonces el sitio no muestra ningún canal inventado, y esta pantalla no permite escribir uno."
    />
  );
}
