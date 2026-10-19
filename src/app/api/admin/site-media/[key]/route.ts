import { z } from "zod";
import { requireSuperadmin } from "@/server/auth/session";
import { recordAudit } from "@/server/audit/log";
import { SITE_MEDIA_BUCKET } from "@/server/auth/config";
import { ApiError, badRequest } from "@/server/http/errors";
import { fail, ok, readJson } from "@/server/http/respond";
import { deleteStoredImage, uploadImage } from "@/server/storage/images";
import { focalSchema } from "@/server/media/focal";
import {
  siteMediaAltSchema,
  siteMediaKeySchema,
  siteMediaPatchSchema,
} from "@/server/site-media/schemas";
import {
  clearSiteMediaMobileImage,
  listSiteMedia,
  requireSlot,
  resetSiteMedia,
  setSiteMediaAlt,
  setSiteMediaFocal,
  setSiteMediaImage,
  setSiteMediaMobileImage,
} from "@/server/site-media/service";
import { CENTER_FOCAL } from "@/lib/focal-point";
import { revalidateSiteMedia } from "@/server/site-media/revalidate";

type Params = { params: Promise<{ key: string }> };

/**
 * Cuál de las dos caras del slot toca esta petición.
 *
 * Por defecto la de escritorio, que es la que siempre existe: así las
 * llamadas que ya había siguen significando lo mismo.
 */
const variantSchema = z.enum(["desktop", "mobile"]).default("desktop");

function readVariant(form: FormData | URLSearchParams): "desktop" | "mobile" {
  const raw = form.get("variant");
  return variantSchema.parse(typeof raw === "string" && raw ? raw : undefined);
}

/**
 * Reemplaza la fotografía de un slot, en la variante que se pida.
 *
 * El orden importa: primero se sube el archivo nuevo, después se apunta la
 * base a él, y solo entonces se borra el anterior. Al revés, un fallo a
 * medias dejaría el sitio apuntando a un archivo que ya no existe.
 *
 * El suelo de resolución es el DEL MARCO que corresponda, no uno global:
 * una imagen para compartir en redes es legítimamente más baja que una
 * portada, y medirla contra el mínimo de la portada la rechazaría sin razón.
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
    const variant = readVariant(form);
    const frame =
      variant === "mobile" ? slot.frames.mobile : slot.frames.desktop;
    if (!frame) {
      throw badRequest("Este espacio no tiene una composición de teléfono.");
    }

    const file = form.get("file");
    if (!(file instanceof File)) throw badRequest("No llegó ninguna imagen.");

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
    const uploaded = await uploadImage(
      SITE_MEDIA_BUCKET,
      variant === "mobile" ? `${key}/mobile` : key,
      file,
      { minimum: frame.minimum },
    );
    const facts = {
      url: uploaded.url,
      storagePath: uploaded.storagePath,
      bytes: uploaded.bytes,
      contentType: uploaded.contentType,
      size: uploaded.dimensions,
      focal,
    };

    const { previousStoragePath } =
      variant === "mobile"
        ? await setSiteMediaMobileImage(key, facts)
        : await setSiteMediaImage(key, {
            ...facts,
            // Si no se escribió un alt nuevo, se conserva el que describía la
            // imagen original: mejor eso que el nombre del archivo, que no
            // describe nada.
            alt: siteMediaAltSchema.parse(
              typeof form.get("alt") === "string" &&
                String(form.get("alt")).trim() !== ""
                ? form.get("alt")
                : slot.legacyAlt,
            ),
          });

    if (previousStoragePath) {
      await deleteStoredImage(SITE_MEDIA_BUCKET, previousStoragePath);
    }

    await recordAudit(session, "UPDATE_SITE_MEDIA", "SiteMedia", key, {
      variant,
      bytes: uploaded.bytes,
      contentType: uploaded.contentType,
      width: uploaded.dimensions?.width ?? null,
      height: uploaded.dimensions?.height ?? null,
    });
    revalidateSiteMedia();

    return ok({ media: await listSiteMedia() });
  } catch (error) {
    return fail(error, "POST /api/admin/site-media/[key]");
  }
}

/**
 * Lo que se cambia sin tocar el archivo: texto alternativo y encuadres.
 *
 * Cada uno deja su propia entrada de auditoría, porque son decisiones
 * distintas: una describe la fotografía para quien no la ve y la otra decide
 * qué parte se ve. Un único "se editó el slot" no diría cuál de las dos.
 *
 * El encuadre de teléfono se puede guardar aunque no haya variante propia:
 * entonces describe cómo se recorta en vertical la fotografía de escritorio,
 * que es el caso más común.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireSuperadmin();
    const { key: rawKey } = await params;
    const key = siteMediaKeySchema.parse(rawKey);

    const { alt, focal, mobileFocal } = siteMediaPatchSchema.parse(
      await readJson(request),
    );

    if (alt !== undefined) {
      await setSiteMediaAlt(key, alt);
      await recordAudit(session, "UPDATE_SITE_MEDIA_ALT", "SiteMedia", key);
    }

    if (focal !== undefined) {
      await setSiteMediaFocal(key, focal, "desktop");
      await recordAudit(session, "UPDATE_SITE_MEDIA_FOCAL", "SiteMedia", key, {
        variant: "desktop",
        focalX: focal.x,
        focalY: focal.y,
      });
    }

    if (mobileFocal !== undefined) {
      await setSiteMediaFocal(key, mobileFocal, "mobile");
      await recordAudit(session, "UPDATE_SITE_MEDIA_FOCAL", "SiteMedia", key, {
        variant: "mobile",
        focalX: mobileFocal.x,
        focalY: mobileFocal.y,
      });
    }

    revalidateSiteMedia();

    return ok({ media: await listSiteMedia() });
  } catch (error) {
    return fail(error, "PATCH /api/admin/site-media/[key]");
  }
}

/**
 * Quita una variante.
 *
 * `?variant=mobile` elimina solo la fotografía de teléfono y el slot vuelve
 * solo al respaldo: la de escritorio con el encuadre de teléfono. Sin
 * parámetro devuelve el slot entero a la fotografía original del sitio.
 */
export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await requireSuperadmin();
    const { key: rawKey } = await params;
    const key = siteMediaKeySchema.parse(rawKey);
    const variant = readVariant(new URL(request.url).searchParams);

    if (variant === "mobile") {
      const { previousStoragePath } = await clearSiteMediaMobileImage(key);
      if (previousStoragePath) {
        await deleteStoredImage(SITE_MEDIA_BUCKET, previousStoragePath);
      }
      await recordAudit(session, "RESET_SITE_MEDIA", "SiteMedia", key, {
        variant: "mobile",
      });
      revalidateSiteMedia();
      return ok({ media: await listSiteMedia() });
    }

    const { previousStoragePaths } = await resetSiteMedia(key);
    for (const path of previousStoragePaths) {
      await deleteStoredImage(SITE_MEDIA_BUCKET, path);
    }

    await recordAudit(session, "RESET_SITE_MEDIA", "SiteMedia", key);
    revalidateSiteMedia();

    return ok({ media: await listSiteMedia() });
  } catch (error) {
    return fail(error, "DELETE /api/admin/site-media/[key]");
  }
}
