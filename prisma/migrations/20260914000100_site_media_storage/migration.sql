-- Bucket para las imágenes estructurales del sitio.
--
-- Separado de vehicle-images a propósito: son dos ciclos de vida distintos.
-- Las fotos de un vehículo se van con el vehículo; estas cuatro pertenecen a
-- la identidad del sitio y sobreviven a todo el inventario. Tenerlas en
-- buckets distintos hace que una limpieza de uno no pueda tocar el otro.
--
-- Lectura pública, porque se ven sin sesión. Escritura solo para un
-- Superadmin activo, reutilizando public.is_active_superadmin() de la
-- migración de RLS: una sola definición de quién manda.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-media',
  'site-media',
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
  DROP POLICY IF EXISTS "mille_site_media_read" ON storage.objects;
  DROP POLICY IF EXISTS "mille_site_media_insert" ON storage.objects;
  DROP POLICY IF EXISTS "mille_site_media_update" ON storage.objects;
  DROP POLICY IF EXISTS "mille_site_media_delete" ON storage.objects;

  CREATE POLICY "mille_site_media_read"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'site-media');

  CREATE POLICY "mille_site_media_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'site-media' AND public.is_active_superadmin());

  CREATE POLICY "mille_site_media_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'site-media' AND public.is_active_superadmin())
    WITH CHECK (bucket_id = 'site-media' AND public.is_active_superadmin());

  CREATE POLICY "mille_site_media_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'site-media' AND public.is_active_superadmin());
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE WARNING
      'No se pudieron crear las políticas de site-media con este rol. Aplícalas desde el panel de Supabase; están en docs/backend.md.';
END
$$;
