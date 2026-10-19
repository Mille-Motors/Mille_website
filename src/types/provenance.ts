import type { ImageRights, ResolvedImageRights } from "@/lib/image-provenance";

/**
 * La procedencia de una fotografía tal como la ve el Admin.
 *
 * El sitio público no lee nada de esto. La única excepción prevista sería una
 * licencia que EXIGIERA atribución donde se publique la fotografía, y hoy
 * ninguna de las que usa el sitio lo exige: todo el material de banco es
 * Unsplash, cuya licencia agradece la atribución pero no la pide.
 */

/** Una fotografía de un vehículo con su procedencia ya resuelta. */
export interface VehicleImageProvenance {
  imageId: string;
  src: string;
  alt: string;
  position: number;
  /** `legacy` vive en /public; `storage` se subió desde el Admin. */
  source: "legacy" | "storage";
  /** Lo registrado para ESTA fotografía, si alguien la distinguió del lote. */
  own: ImageRights | null;
  /** Lo que acaba respondiendo, y de dónde salió. */
  resolved: ResolvedImageRights;
}

/** El lote fotográfico de un vehículo y sus fotografías. */
export interface VehicleProvenance {
  vehicleId: string;
  /** La procedencia del lote: cómo llegaron las fotos de este vehículo. */
  lot: ImageRights | null;
  images: VehicleImageProvenance[];
  /** Cuántas fotografías siguen sin procedencia registrada. */
  pendingCount: number;
}

/** Un espacio estructural del sitio con su procedencia resuelta. */
export interface SiteMediaProvenance {
  key: string;
  label: string;
  /** Lo registrado en la fila, cuando se subió una fotografía propia. */
  own: ImageRights | null;
  resolved: ResolvedImageRights;
  /** Si el espacio sigue mostrando el archivo del repositorio. */
  usesRepositoryFile: boolean;
}
