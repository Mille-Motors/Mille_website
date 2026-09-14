import type { ImageSource } from "@/generated/prisma/enums";

/**
 * Qué hay que hacer al eliminar un vehículo.
 *
 * La decisión se separa de su ejecución, y es una función pura, para poder
 * probarla sin una base de datos ni una sesión de Supabase detrás. Lo que
 * falló en producción no fue el borrado en sí: fue que nadie había decidido
 * qué pasaba con los archivos del bucket.
 */
export interface VehicleDeletionPlan {
  /** Con solicitudes detrás se archiva: el vehículo y sus fotos se conservan. */
  archived: boolean;
  /** Rutas del bucket a borrar, *después* de que la base confirme el borrado. */
  storagePaths: string[];
}

export function planVehicleDeletion(
  inquiryCount: number,
  images: readonly { source: ImageSource; storagePath: string | null }[],
): VehicleDeletionPlan {
  // Archivar no destruye nada: el vehículo sigue existiendo y sus imágenes le
  // siguen perteneciendo. Borrar sus archivos dejaría un archivado roto.
  if (inquiryCount > 0) {
    return { archived: true, storagePaths: [] };
  }

  return {
    archived: false,
    // Solo lo que subimos nosotros. Las heredadas viven en /public, son parte
    // del repositorio, y no hay nada que borrar en ningún bucket.
    storagePaths: images
      .filter(
        (image): image is typeof image & { storagePath: string } =>
          image.source === "STORAGE" && image.storagePath !== null,
      )
      .map((image) => image.storagePath),
  };
}
