import type { FocalPoint } from "@/lib/focal-point";
import type { PixelSize, SiteMediaFrames } from "@/lib/site-media";

/**
 * De dónde sale el archivo de una imagen del sitio.
 *
 * `legacy` vive en /public y es parte del repositorio: el admin puede dejar
 * de usarla, pero no borrarla del disco. `storage` se subió desde el admin a
 * Supabase Storage y sí se puede reemplazar y eliminar.
 */
export type SiteMediaSource = "legacy" | "storage";

/** Una de las dos caras de un slot, tal como la ve el admin. */
export interface SiteMediaVariantEntry {
  src: string;
  source: SiteMediaSource;
  focal: FocalPoint;
  /**
   * Lo que mide el archivo, si se sabe. Las fotografías heredadas de
   * /public y las subidas antes de que esto se anotara llegan en `null`, y
   * entonces el Admin las mide en el navegador al cargarlas.
   */
  size: PixelSize | null;
  bytes: number | null;
  contentType: string | null;
}

/** Una imagen estructural del sitio, tal como la ve el admin. */
export interface SiteMediaEntry {
  key: string;
  label: string;
  description: string;
  aspect: string;
  /** Los marcos reales en los que la página recorta esta fotografía. */
  frames: SiteMediaFrames;
  /** El teléfono recorta tan distinto que conviene una segunda fotografía. */
  mobileVariantRecommended: boolean;
  /** Peso a partir del cual el Admin avisa, si para este espacio importa. */
  recommendedMaxBytes: number | null;
  /** Acompaña a un texto que ya lo dice todo: se sirve con `alt=""`. */
  decorative: boolean;
  alt: string;
  /** La única variante obligatoria. */
  desktop: SiteMediaVariantEntry;
  /** `null` cuando el teléfono usa la de escritorio. */
  mobile: SiteMediaVariantEntry | null;
  /** Se aplica en teléfono exista o no variante propia. */
  mobileFocal: FocalPoint;
  /** Null mientras el slot siga con su imagen original. */
  updatedAt: string | null;
}
