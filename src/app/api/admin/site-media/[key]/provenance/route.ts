import { requireSuperadmin } from "@/server/auth/session";
import { recordAudit } from "@/server/audit/log";
import { fail, ok, readJson } from "@/server/http/respond";
import { siteMediaKeySchema } from "@/server/site-media/schemas";
import { imageRightsPatchSchema } from "@/server/provenance/schemas";
import {
  listSiteMediaProvenance,
  setSiteMediaRights,
} from "@/server/provenance/service";

type Params = { params: Promise<{ key: string }> };

/**
 * La procedencia de un espacio estructural del sitio.
 *
 * No revalida ninguna superficie pública: el sitio no muestra procedencia, y
 * registrarla no cambia ni la fotografía ni su encuadre. Invalidar la home
 * por esto sería tirar una caché por un dato que la home no lee.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireSuperadmin();
    const key = siteMediaKeySchema.parse((await params).key);
    const { rights } = imageRightsPatchSchema.parse(await readJson(request));

    await setSiteMediaRights(key, rights);

    await recordAudit(
      session,
      "UPDATE_SITE_MEDIA_PROVENANCE",
      "SiteMedia",
      key,
      { sourceType: rights?.sourceType ?? null, cleared: rights === null },
    );

    return ok({ provenance: await listSiteMediaProvenance() });
  } catch (error) {
    return fail(error, "PATCH /api/admin/site-media/[key]/provenance");
  }
}
