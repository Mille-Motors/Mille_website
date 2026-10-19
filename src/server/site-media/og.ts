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
 * Las dimensiones describen EL ARCHIVO QUE RECIBE EL RASTREADOR, nunca lo
 * que nos gustaría que midiera: declarar 1200 × 630 sobre un archivo de
 * 1800 × 1200 haría que la previsualización se dibujara mal en quien se fía
 * de la metadata. Si no se conocen, se omiten — una etiqueta ausente es
 * correcta; una etiqueta que miente, no.
 *
 * Nunca lanza. Si la base no responde, cae a la constante de siempre: un
 * enlace compartido sin imagen es peor que una imagen vieja, y una página
 * que revienta al generar su metadata, mucho peor que las dos.
 */
export async function defaultOgImage() {
  try {
    const image = await getSiteMediaImage("seo.defaultOg");
    const { size, contentType } = image.desktop;
    return {
      url: absoluteImageUrl(image.desktop.src),
      ...(size ? { width: size.width, height: size.height } : {}),
      ...(contentType ? { type: contentType } : {}),
      alt: OG_IMAGE.alt,
    };
  } catch (error) {
    console.error(
      "[mille:site-media] no se pudo resolver la imagen de compartir",
      error,
    );
    return OG_IMAGE;
  }
}

/** Lo mismo, en la forma que espera `socialMetadata`. */
export async function defaultOgImages() {
  return [await defaultOgImage()];
}
