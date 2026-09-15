import { requireSuperadmin } from "@/server/auth/session";
import { recordAudit } from "@/server/audit/log";
import { SITE_MEDIA_BUCKET } from "@/server/auth/config";
import { ApiError, badRequest } from "@/server/http/errors";
import { fail, ok, readJson } from "@/server/http/respond";
import { deleteStoredImage, uploadImage } from "@/server/storage/images";
import {
  focalSchema,
  siteMediaAltSchema,
  siteMediaKeySchema,
  siteMediaPatchSchema,
} from "@/server/site-media/schemas";
import {
  listSiteMedia,
  requireSlot,
  resetSiteMedia,
  setSiteMediaAlt,
  setSiteMediaFocal,
  setSiteMediaImage,
} from "@/server/site-media/service";
import { CENTER_FOCAL } from "@/lib/focal-point";
import { revalidateSiteMedia } from "@/server/site-media/revalidate";

type Params = { params: Promise<{ key: string }> };

/**
 * Reemplaza la fotografía de un slot.
 *
 * El orden importa: primero se sube el archivo nuevo, después se apunta la
 * base a él, y solo entonces se borra el anterior. Al revés, un fallo a
 * medias dejaría el sitio apuntando a un archivo que ya no existe.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireSuperadmin();
    const { key: rawKey } = await params;
    const key = siteMediaKeySchema.parse(rawKey);
    const slot = await requireSlot(key);

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      throw new ApiError(
        "UNSUPPORTED_MEDIA_TYPE",
        "La imagen se envía como multipart/form-data.",
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw badRequest("No llegó ninguna imagen.");

    const rawAlt = form.get("alt");
    // Si no se escribió un alt nuevo, se conserva el que describía la imagen
    // original: mejor eso que el nombre del archivo, que no describe nada.
    const alt = siteMediaAltSchema.parse(
      typeof rawAlt === "string" && rawAlt.trim() !== ""
        ? rawAlt
        : slot.legacyAlt,
    );

    // El encuadre viaja con el archivo para que subir y encuadrar sean un
    // solo gesto. Si no llega, la fotografía nueva nace centrada en vez de
    // heredar el encuadre de la que reemplaza.
    const rawFocal = form.get("focal");
    const focal =
      typeof rawFocal === "string" && rawFocal !== ""
        ? focalSchema.parse(JSON.parse(rawFocal))
        : CENTER_FOCAL;

    // El prefijo lo decide el servidor a partir de la clave del slot, que ya
    // está validada contra la lista del código.
    const uploaded = await uploadImage(SITE_MEDIA_BUCKET, key, file);

    const { previousStoragePath } = await setSiteMediaImage(key, {
      url: uploaded.url,
      storagePath: uploaded.storagePath,
      alt,
      focal,
    });

    if (previousStoragePath) {
      await deleteStoredImage(SITE_MEDIA_BUCKET, previousStoragePath);
    }

    await recordAudit(session, "UPDATE_SITE_MEDIA", "SiteMedia", key, {
      bytes: uploaded.bytes,
      contentType: uploaded.contentType,
    });
    revalidateSiteMedia();

    return ok({ media: await listSiteMedia() });
  } catch (error) {
    return fail(error, "POST /api/admin/site-media/[key]");
  }
}

/**
 * Lo que se cambia sin tocar el archivo: texto alternativo y encuadre.
 *
 * Cada uno deja su propia entrada de auditoría, porque son decisiones
 * distintas: una describe la fotografía para quien no la ve y la otra decide
 * qué parte se ve. Un único "se editó el slot" no diría cuál de las dos.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireSuperadmin();
    const { key: rawKey } = await params;
    const key = siteMediaKeySchema.parse(rawKey);

    const { alt, focal } = siteMediaPatchSchema.parse(await readJson(request));

    if (alt !== undefined) {
      await setSiteMediaAlt(key, alt);
      await recordAudit(session, "UPDATE_SITE_MEDIA_ALT", "SiteMedia", key);
    }

    if (focal !== undefined) {
      await setSiteMediaFocal(key, focal);
      await recordAudit(session, "UPDATE_SITE_MEDIA_FOCAL", "SiteMedia", key, {
        focalX: focal.x,
        focalY: focal.y,
      });
    }

    revalidateSiteMedia();

    return ok({ media: await listSiteMedia() });
  } catch (error) {
    return fail(error, "PATCH /api/admin/site-media/[key]");
  }
}

/** Devuelve el slot a la fotografía original del sitio. */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await requireSuperadmin();
    const { key: rawKey } = await params;
    const key = siteMediaKeySchema.parse(rawKey);

    const { previousStoragePath } = await resetSiteMedia(key);
    if (previousStoragePath) {
      await deleteStoredImage(SITE_MEDIA_BUCKET, previousStoragePath);
    }

    await recordAudit(session, "RESET_SITE_MEDIA", "SiteMedia", key);
    revalidateSiteMedia();

    return ok({ media: await listSiteMedia() });
  } catch (error) {
    return fail(error, "DELETE /api/admin/site-media/[key]");
  }
}
