import { getImageProps } from "next/image";
import { cn } from "@/lib/cn";
import { objectPosition } from "@/lib/focal-point";
import {
  MOBILE_BREAKPOINT_PX,
  MOBILE_MEDIA_QUERY,
  type SiteMediaImage,
} from "@/lib/site-media";

/**
 * Una fotografía del sitio, con su composición de escritorio y la de
 * teléfono.
 *
 * Por qué `<picture>` y no dos `<Image>` con clases responsive: esconder una
 * con CSS no evita que el navegador la descargue. `<source media>` sí —el
 * navegador evalúa la consulta ANTES de pedir nada y baja exactamente un
 * archivo—. `getImageProps` deja que Next siga generando el `srcSet`
 * optimizado de cada variante, así que no se pierde nada por salirse del
 * componente.
 *
 * Y es HTML nativo: la decisión la toma el navegador con el viewport que
 * tiene en ese instante. Girar el teléfono, abrir un plegable o arrastrar
 * el borde de la ventana cambian la fuente sin recargar y sin una línea de
 * JavaScript. No hay `window.innerWidth` en ninguna parte, así que tampoco
 * hay un valor calculado al montar que se quede viejo.
 *
 * EL ENCUADRE DE TELÉFONO SE APLICA AUNQUE NO HAYA VARIANTE PROPIA. Es el
 * caso normal: una sola fotografía, dos `object-position`. Se resuelve con
 * dos variables CSS y una consulta de medios —ver `.focal-art` en
 * globals.css— porque un `style` en línea solo admite un valor y habría que
 * elegir el del viewport inicial, que es justo lo que no queremos.
 */
export function SiteMediaPicture({
  image,
  alt,
  className,
  sizes,
  mobileSizes,
  priority = false,
  quality,
}: {
  image: SiteMediaImage;
  /** Para los slots decorativos, `""`. Si se omite, el del slot. */
  alt?: string;
  /** Va al `<img>`: `object-cover`, transiciones, lo que el diseño ya tenía. */
  className?: string;
  /** El hueco REAL en escritorio. */
  sizes: string;
  /** El hueco real en teléfono, si difiere. Por defecto, el mismo. */
  mobileSizes?: string;
  /** Solo para la fotografía que es LCP de su página. */
  priority?: boolean;
  quality?: number;
}) {
  const shared = {
    fill: true as const,
    alt: alt ?? image.alt,
    priority,
    ...(quality === undefined ? {} : { quality }),
  };

  const { props: desktop } = getImageProps({
    ...shared,
    src: image.desktop.src,
    sizes,
  });

  const mobile = image.mobile
    ? getImageProps({
        ...shared,
        src: image.mobile.src,
        sizes: mobileSizes ?? sizes,
      }).props
    : null;

  // Complementaria exacta de `MOBILE_MEDIA_QUERY`: ningún viewport cumple
  // las dos, así que ningún dispositivo precarga los dos archivos.
  const desktopMedia = `(min-width: ${MOBILE_BREAKPOINT_PX}px)`;

  return (
    <>
      {/* El preload que `next/image` añade con `priority` no viaja en
          `getImageProps`, así que se pone a mano. Con `media` en cada uno,
          el teléfono precarga su variante y el escritorio la suya: nunca
          las dos. React 19 los sube solo a `<head>`. */}
      {priority ? (
        <>
          {mobile ? (
            <link
              rel="preload"
              as="image"
              imageSrcSet={mobile.srcSet}
              imageSizes={mobile.sizes}
              media={MOBILE_MEDIA_QUERY}
              fetchPriority="high"
            />
          ) : null}
          <link
            rel="preload"
            as="image"
            imageSrcSet={desktop.srcSet}
            imageSizes={desktop.sizes}
            media={mobile ? desktopMedia : undefined}
            fetchPriority="high"
          />
        </>
      ) : null}

      <picture>
        {mobile ? (
          <source
            media={MOBILE_MEDIA_QUERY}
            srcSet={mobile.srcSet}
            sizes={mobile.sizes}
          />
        ) : null}
        {/* `getImageProps` entrega exactamente lo que `next/image` habría
            puesto en este `<img>`; el elemento crudo es lo que `<picture>`
            exige para poder ofrecer varias fuentes. */}
        <img
          {...desktop}
          alt={desktop.alt}
          className={cn("focal-art", className)}
          style={{
            ...desktop.style,
            // Dos encuadres, uno por viewport. Los lee `.focal-art`.
            "--focal-d": objectPosition(image.desktop.focal),
            "--focal-m": objectPosition(
              image.mobile?.focal ?? image.mobileFocal,
            ),
          } as React.CSSProperties}
        />
      </picture>
    </>
  );
}
