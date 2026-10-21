/**
 * Compartir una ficha.
 *
 * Lo que hay aquí es lo que no necesita el navegador para probarse: a qué
 * destinos se puede mandar un enlace y con qué texto. El botón que lo usa vive
 * en `components/vehicle/ShareButton.tsx`.
 *
 * Cómo se comparte, en orden de preferencia:
 *
 *  1. La hoja de compartir del sistema (`navigator.share`). En un teléfono es
 *     la mejor respuesta: abre las aplicaciones que la persona de verdad tiene
 *     instaladas —WhatsApp, Instagram, Mensajes, Telegram— sin que MILLE tenga
 *     que listarlas ni mantener un botón por red.
 *  2. Donde esa hoja no existe (casi todo escritorio), un menú corto: copiar el
 *     enlace, WhatsApp, Facebook y correo.
 *
 * Instagram no está en la segunda lista a propósito: no ofrece ninguna
 * dirección web para compartir un enlace, así que un botón «Instagram» solo
 * podría abrir la aplicación sin llevar nada. Se comparte a Instagram desde la
 * hoja del sistema en el teléfono, o copiando el enlace y pegándolo en una
 * historia o un mensaje.
 */

import { site } from "@/data/site";

export interface ShareInput {
  /** La dirección absoluta de la ficha: es lo que se pega en otra aplicación. */
  url: string;
  title: string;
  /** Una línea que acompaña al enlace. */
  text: string;
}

export interface ShareTarget {
  id: "whatsapp" | "facebook" | "email";
  label: string;
  href: string;
}

/** Los destinos con dirección web propia. «Copiar» no está aquí: no es un enlace. */
export function shareTargets({ url, title, text }: ShareInput): ShareTarget[] {
  const message = `${text} ${url}`;
  return [
    {
      id: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(message)}`,
    },
    {
      id: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      id: "email",
      label: "Correo",
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
    },
  ];
}

/**
 * El texto que acompaña al enlace: qué es y de dónde viene. Corto, porque una
 * aplicación como WhatsApp lo muestra completo encima de la tarjeta de vista
 * previa, y esa tarjeta ya lleva la foto, el título y la descripción.
 */
export function vehicleShareText(title: string, price: string | null): string {
  return price ? `${title}, ${price}, en MILLE.` : `${title}, en MILLE.`;
}

/** ¿Este navegador sabe abrir la hoja de compartir del sistema? */
export function canShareNatively(nav: { share?: unknown } | undefined): boolean {
  return typeof nav?.share === "function";
}

/**
 * Copiar al portapapeles, con respaldo.
 *
 * `navigator.clipboard` solo existe en contextos seguros (https y localhost);
 * en una página servida de otra forma, o en un navegador viejo, falla. El
 * respaldo es el truco de siempre: un `<textarea>` fuera de pantalla, seleccionado
 * y copiado con `execCommand`. Devuelve si se logró, para que quien llama no
 * diga «copiado» cuando no lo está.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Cae al respaldo: un permiso denegado no es el fin.
  }

  if (typeof document === "undefined") return false;
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.top = "-1000px";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(field);
  }
}

/**
 * La dirección pública de una ficha, la que se pega en Instagram o en un
 * mensaje. Sale del dato del sitio y no de `window.location`: copiada desde el
 * admin en un entorno de pruebas, esta última daría una dirección que nadie más
 * puede abrir.
 */
export function vehiclePublicUrl(slug: string): string {
  return `${site.url.replace(/\/$/, "")}/vehiculos/${slug}`;
}
