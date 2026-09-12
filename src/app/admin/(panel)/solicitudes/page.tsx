import { InquiriesAdmin } from "@/components/admin/InquiriesAdmin";
import { adminInquiryQuerySchema } from "@/server/inquiries/schemas";
import {
  countInquiriesByStatus,
  listInquiries,
} from "@/server/inquiries/service";

export const metadata = { title: "Solicitudes" };

/**
 * Lo que llega de los formularios públicos. Sin correo ni WhatsApp todavía,
 * esta pantalla es el buzón: es lo que hace que activar los formularios
 * tenga utilidad real desde el primer día.
 */
export default async function AdminInquiriesPage(
  props: PageProps<"/admin/solicitudes">,
) {
  const searchParams = await props.searchParams;
  const parsed = adminInquiryQuerySchema.safeParse(searchParams);
  const query = parsed.success ? parsed.data : adminInquiryQuerySchema.parse({});

  const [{ inquiries, total }, counts] = await Promise.all([
    listInquiries(query),
    countInquiriesByStatus(),
  ]);

  return (
    <InquiriesAdmin
      inquiries={inquiries}
      counts={counts}
      total={total}
      status={query.status}
    />
  );
}
