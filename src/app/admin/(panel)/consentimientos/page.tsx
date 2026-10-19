import { redirect } from "next/navigation";
import { ConsentAdmin } from "@/components/admin/ConsentAdmin";
import { adminConsentHref } from "@/lib/admin-urls";
import { parseTolerant } from "@/lib/query-params";
import { adminConsentQuerySchema } from "@/server/consent/schemas";
import {
  countConsentEvents,
  listConsentEvents,
  listConsentSources,
} from "@/server/consent/service";

export const metadata = { title: "Consentimientos" };

/**
 * La evidencia de lo que cada persona autorizó.
 *
 * Componente de servidor, como el resto del Admin: lee la base directamente,
 * así que lo que se ve es lo que hay y no una copia en el navegador. Esto
 * importa más aquí que en ninguna otra pantalla —es la prueba—, y por eso
 * tampoco hay estado local que pueda quedarse desfasado.
 */
export default async function AdminConsentPage(
  props: PageProps<"/admin/consentimientos">,
) {
  const searchParams = await props.searchParams;
  // Tolerante por campo: un parámetro inválido no debe llevarse por delante
  // los filtros válidos que sí venían en la URL.
  const query = parseTolerant(adminConsentQuerySchema, searchParams);

  const [{ events, total }, counts, sources] = await Promise.all([
    listConsentEvents(query),
    countConsentEvents(),
    listConsentSources(),
  ]);

  const pages = Math.max(1, Math.ceil(total / query.limit));
  if (query.page > pages) {
    redirect(adminConsentHref({ ...query, page: pages }));
  }

  return (
    <ConsentAdmin
      events={events}
      total={total}
      counts={counts}
      sources={sources}
      query={query}
    />
  );
}
