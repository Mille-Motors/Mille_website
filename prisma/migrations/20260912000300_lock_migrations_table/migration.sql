-- La tabla de control de Prisma la crea el propio motor de migraciones, así
-- que nace con los privilegios que Supabase concede por defecto en `public`
-- y se le escapó a la migración anterior, que solo cubría las seis tablas
-- de negocio.
--
-- RLS ya la deja fuera del alcance de PostgREST, pero la política de este
-- proyecto es no depender de una sola capa: si `anon` no tiene por qué
-- leerla, tampoco tiene por qué conservar el GRANT.
REVOKE ALL ON TABLE "_prisma_migrations" FROM anon, authenticated;
