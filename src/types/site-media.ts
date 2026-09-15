import type { FocalPoint } from "@/lib/focal-point";
import type { SiteMediaFrames } from "@/lib/site-media";

/**
 * De dónde sale el archivo de una imagen del sitio.
 *
 * `legacy` vive en /public y es parte del repositorio: el admin puede dejar
 * de usarla, pero no borrarla del disco. `storage` se subió desde el admin a
 * Supabase Storage y sí se puede reemplazar y eliminar.
 */
export type SiteMediaSource = "legacy" | "storage";

/** Una imagen estructural del sitio, tal como la ve el admin. */
export interface SiteMediaEntry {
  key: string;
  label: string;
  description: string;
  aspect: string;
  /** Los marcos reales en los que la página recorta esta fotografía. */
  frames: SiteMediaFrames;
  src: string;
  alt: string;
  source: SiteMediaSource;
  /** Qué parte de la fotografía se muestra. El centro es 50/50. */
  focal: FocalPoint;
  storagePath: string | null;
  /** Null mientras el slot siga con su imagen original. */
  updatedAt: string | null;
}
