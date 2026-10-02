import { CENTER_FOCAL, type FocalPoint } from "@/lib/focal-point";
import type { SiteMediaFrames } from "@/lib/site-media";

/**
 * El marco en el que se ve TODA fotografía de vehículo.
 *
 * Hay uno solo y es horizontal. No se ofrece elegir proporción en ninguna
 * parte: quien administra decide qué parte de la fotografía se ve, no qué
 * forma tiene. Un inventario donde cada ficha tuviera su proporción se vería
 * desordenado por mucho cuidado que se pusiera en cada foto por separado.
 *
 * 4:3 no es una elección nueva: es la proporción que ya usaban la tarjeta
 * del inventario, su esqueleto de carga, la rejilla del administrador, la
 * foto principal en teléfono y sus miniaturas. El único sitio que se salía
 * era la foto principal en escritorio, con 3:2, y esa discrepancia es la
 * razón de que el encuadre elegido no pudiera corresponderse con lo
 * publicado: el mismo punto focal en dos marcos distintos enseña dos trozos
 * distintos de la misma fotografía.
 *
 * La fotografía original se conserva entera en Storage. Esto solo decide
 * qué ventana se asoma a ella.
 */
export const VEHICLE_FRAME_RATIO = 4 / 3;

/** La clase de Tailwind correspondiente, para no escribirla en cinco sitios. */
export const VEHICLE_FRAME_CLASS = "aspect-[4/3]";

/**
 * El marco tal y como lo espera `FocalPointEditor`, que es el mismo editor
 * que encuadra las fotografías generales del sitio.
 *
 * `mobile: null` no es una omisión: el editor usa ese hueco para ofrecer una
 * pestaña de vista previa cuando una fotografía se recorta distinto según el
 * tamaño de pantalla, y aquí no ocurre — el marco es el mismo en teléfono y
 * en escritorio. Con un solo marco, el editor esconde el selector solo.
 */
export const VEHICLE_FRAMES: SiteMediaFrames = {
  desktop: { label: "Horizontal", ratio: VEHICLE_FRAME_RATIO },
  mobile: null,
};

/**
 * El encuadre con el que nace una fotografía: el centro.
 *
 * Es exactamente lo que hacía el sitio antes de que esto existiera —
 * `object-fit: cover` sin más centra por defecto—, así que una fotografía que
 * nadie haya encuadrado se ve hoy igual que ayer. Por eso "restablecer
 * encuadre" vuelve aquí: no borra la fotografía, la devuelve a no haber
 * tomado ninguna decisión.
 */
export const VEHICLE_DEFAULT_FOCAL: FocalPoint = CENTER_FOCAL;
