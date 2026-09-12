-- Bucket de imágenes de vehículos.
--
-- Lectura pública, porque las fotos se ven en el sitio sin sesión. Escritura
-- solo para un Superadmin activo: el admin sube con el cliente autenticado
-- de la persona que ha entrado, así que estas políticas se evalúan sobre su
-- sesión y no hace falta ninguna service role key en el proyecto.
--
-- Todo va envuelto en un bloque que tolera falta de privilegios: en algunas
-- instalaciones el rol de migración no es dueño de storage.objects. Si eso
-- pasa, la migración no se cae — el resto del esquema es válido — y deja un
-- aviso para aplicar estas cuatro políticas desde el panel de Supabase.
-- docs/backend.md las recoge literalmente.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-images',
  'vehicle-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  DROP POLICY IF EXISTS "mille_vehicle_images_read" ON storage.objects;
  DROP POLICY IF EXISTS "mille_vehicle_images_insert" ON storage.objects;
  DROP POLICY IF EXISTS "mille_vehicle_images_update" ON storage.objects;
  DROP POLICY IF EXISTS "mille_vehicle_images_delete" ON storage.objects;

  CREATE POLICY "mille_vehicle_images_read"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'vehicle-images');

  CREATE POLICY "mille_vehicle_images_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'vehicle-images' AND public.is_active_superadmin()
    );

  CREATE POLICY "mille_vehicle_images_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'vehicle-images' AND public.is_active_superadmin())
    WITH CHECK (
      bucket_id = 'vehicle-images' AND public.is_active_superadmin()
    );

  CREATE POLICY "mille_vehicle_images_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'vehicle-images' AND public.is_active_superadmin());
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE WARNING
      'No se pudieron crear las políticas de storage.objects con este rol. Aplícalas desde el panel de Supabase; están en docs/backend.md.';
END
$$;
