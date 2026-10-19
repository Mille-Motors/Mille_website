import { redirect } from "next/navigation";
import { InquiriesAdmin } from "@/components/admin/InquiriesAdmin";
import { adminInquiriesHref } from "@/lib/admin-urls";
import { parseTolerant } from "@/lib/query-params";
import { adminInquiryQuerySchema } from "@/server/inquiries/schemas";
import {
  countInquiriesByStatus,
  listInquiries,
  listInquiryVehicleOptions,
} from "@/server/inquiries/service";

export const metadata = { title: "Solicitudes" };

/**
 * Lo que llega de los formularios públicos.
 *
 * Es el buzón del sitio: no hay notificación por correo, así que una
 * solicitud solo se ve entrando aquí. El correo y el WhatsApp de MILLE ya
 * existen y son canales de entrada por su cuenta; lo que no existe todavía
 * es correo transaccional que avise de esto.
 */
export default async function AdminInquiriesPage(
  props: PageProps<"/admin/solicitudes">,
) {
  const searchParams = await props.searchParams;
  // Tolerante por campo: un parámetro inválido no debe llevarse por delante
  // los filtros válidos que sí venían en la URL.
  const query = parseTolerant(adminInquiryQuerySchema, searchParams);

  const [{ inquiries, total }, counts, vehicleOptions] = await Promise.all([
    listInquiries(query),
    countInquiriesByStatus(),
    listInquiryVehicleOptions(),
  ]);

  // Igual que en vehículos: una página inexistente se corrige en la URL.
  const pages = Math.max(1, Math.ceil(total / query.limit));
  if (query.page > pages) {
    redirect(adminInquiriesHref({ ...query, page: pages }));
  }

  return (
    <InquiriesAdmin
      inquiries={inquiries}
      counts={counts}
      total={total}
      query={query}
      vehicleOptions={vehicleOptions}
    />
  );
}
