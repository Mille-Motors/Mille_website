import { AdminLogin } from "@/components/admin/AdminLogin";

export const metadata = { title: "Entrar" };

/**
 * La única puerta de entrada. No hay enlace a esta ruta desde el sitio
 * público — se entra escribiéndola — pero eso es comodidad, no seguridad: lo
 * que protege el admin es Supabase Auth más la autorización por rol en el
 * servidor.
 */
export default async function AdminLoginPage(
  props: PageProps<"/admin/login">,
) {
  const { reason } = await props.searchParams;
  return <AdminLogin denied={reason === "denied"} />;
}
