import { AdminShell } from "@/components/admin/AdminShell";
import { requireSuperadminPage } from "@/server/auth/session";
import { getAdminNavBadges } from "@/server/admin/badges";

/**
 * Todo lo que cuelga de aquí es privado.
 *
 * La comprobación se hace en el servidor y contra la base: `proxy.ts` solo
 * evita que alguien sin sesión aterrice en una pantalla vacía, pero quien
 * decide si esta cuenta es Superadmin es esto. Cada endpoint vuelve a
 * comprobarlo por su cuenta.
 */
export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSuperadminPage();
  const badges = await getAdminNavBadges();

  return (
    <AdminShell session={session} badges={badges}>
      {children}
    </AdminShell>
  );
}
