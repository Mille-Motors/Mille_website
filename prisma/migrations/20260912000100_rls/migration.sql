-- Cierra la Data API de Supabase sobre las tablas de MILLE.
--
-- Supabase expone automáticamente el esquema `public` por PostgREST con los
-- roles `anon` y `authenticated`. Esta aplicación no usa esa API: lee y
-- escribe por conexión Postgres directa desde el servidor, con Prisma. Así
-- que la superficie se cierra entera.
--
-- Se hacen las dos cosas, y a propósito:
--
--   1. RLS activado sin políticas → PostgREST no puede leer ni escribir nada.
--   2. Privilegios revocados a anon y authenticated → ni siquiera llega a
--      evaluarse una política.
--
-- Lo segundo no sobra: RLS no aplica al dueño de la tabla, y depender de una
-- sola capa para que la lista de clientes de MILLE no sea pública es poco.
-- La autorización real, de todos modos, la aplica el servidor en cada
-- endpoint: esto es la red de seguridad, no la puerta.

ALTER TABLE "AdminUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vehicle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VehicleImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inquiry" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "AdminUser" FROM anon, authenticated;
REVOKE ALL ON TABLE "AdminAuditLog" FROM anon, authenticated;
REVOKE ALL ON TABLE "Category" FROM anon, authenticated;
REVOKE ALL ON TABLE "Vehicle" FROM anon, authenticated;
REVOKE ALL ON TABLE "VehicleImage" FROM anon, authenticated;
REVOKE ALL ON TABLE "Inquiry" FROM anon, authenticated;

-- Quién es Superadmin, en SQL.
--
-- Existe para que las políticas de Storage puedan preguntarlo: se ejecutan
-- como `authenticated`, que acaba de perder el acceso a "AdminUser". Es
-- SECURITY DEFINER para poder consultarla, y STABLE y de search_path fijo
-- para que no se pueda secuestrar con una tabla homónima.
--
-- Acepta el vínculo por authUserId o por el correo del JWT: el enlace con
-- auth.users se hace en el primer inicio de sesión, y hasta entonces el
-- correo es lo único que hay.
CREATE OR REPLACE FUNCTION public.is_active_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."AdminUser" au
    WHERE au.active
      AND au.role = 'SUPERADMIN'
      AND (
        au."authUserId" = auth.uid()
        OR lower(au.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_superadmin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_active_superadmin() TO authenticated;
