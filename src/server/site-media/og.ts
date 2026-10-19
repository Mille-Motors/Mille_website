import "server-only";

import { OG_IMAGE, absoluteImageUrl } from "@/lib/seo";
import { getSiteMediaImage } from "@/server/site-media/service";

/**
 * La fotografía que acompaña a un enlace del sitio en WhatsApp o en redes.
 *
 * Antes era una constante que apuntaba a `/images/brand/night.jpg`, el mismo
 * archivo que usaban la portada de Contacto, la 404 y el menú: cambiar
 * cualquiera de los cuatro cambiaba los demás sin que nadie lo hubiera
 * pedido. Ahora sale de su propio espacio administrable.
 *
 * Nunca lanza. Si la base no responde, cae a la constante de siempre: un
 * enlace compartido sin imagen es peor que una imagen vieja, y una página
 * que revienta al generar su metadata, mucho peor que las dos.
 */
export async function defaultOgImage() {
  try {
    const image = await getSiteMediaImage("seo.defaultOg");
    const size = image.desktop.size;
    return {
      url: absoluteImageUrl(image.desktop.src),
      ...(size ? { width: size.width, height: size.height } : {}),
      alt: OG_IMAGE.alt,
    };
  } catch (error) {
    console.error("[mille:site-media] no se pudo resolver la imagen de compartir", error);
    return OG_IMAGE;
  }
}

/** Lo mismo, en la forma que espera `socialMetadata`. */
export async function defaultOgImages() {
  return [await defaultOgImage()];
}
