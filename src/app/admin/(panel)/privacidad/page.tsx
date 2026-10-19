import { redirect } from "next/navigation";
import { PrivacyAdmin } from "@/components/admin/PrivacyAdmin";
import { adminPrivacyHref } from "@/lib/admin-urls";
import { parseTolerant } from "@/lib/query-params";
import { adminPrivacyQuerySchema } from "@/server/privacy/schemas";
import {
  getPrivacyRequestSummary,
  listPrivacyRequests,
} from "@/server/privacy/service";

export const metadata = { title: "Solicitudes de privacidad" };

/**
 * Los trámites de derechos del Titular.
 *
 * Separada de /admin/solicitudes a propósito: «quiero vender mi Porsche» y
 * «quiero que eliminen mis datos» llegan por el mismo WhatsApp, pero solo una
 * de las dos tiene un plazo legal que se vence.
 */
export default async function AdminPrivacyPage(
  props: PageProps<"/admin/privacidad">,
) {
  const searchParams = await props.searchParams;
  const query = parseTolerant(adminPrivacyQuerySchema, searchParams);

  const [{ requests, total }, summary] = await Promise.all([
    listPrivacyRequests(query),
    getPrivacyRequestSummary(),
  ]);

  const pages = Math.max(1, Math.ceil(total / query.limit));
  if (query.page > pages) {
    redirect(adminPrivacyHref({ ...query, page: pages }));
  }

  return (
    <PrivacyAdmin
      requests={requests}
      total={total}
      summary={summary}
      query={query}
    />
  );
}
