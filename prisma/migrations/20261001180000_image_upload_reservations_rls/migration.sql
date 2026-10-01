-- MILLE — cerrar la Data API sobre "VehicleImageUpload".
--
-- La tabla se creó en 20261001160000 sin el endurecimiento que llevan todas
-- las demás tablas internas (ver 20260912000100_rls y 20260914000000_site_media).
-- Esa migración ya está aplicada y no se toca: esto lo corrige aparte.
--
-- Lo que se encontró en la base real:
--
--   relrowsecurity = true   ← Supabase activa RLS solo en las tablas nuevas
--   grants          = anon y authenticated con los SIETE privilegios
--
-- O sea, faltaba exactamente la mitad de la postura del proyecto. Con RLS
-- activo y sin políticas, PostgREST no devuelve filas, así que la fuga de
-- lectura no llegó a existir. Pero el REVOKE no es redundante:
--
--   · TRUNCATE no está sujeto a RLS. Nunca lo está. Un rol con ese
--     privilegio vacía la tabla aunque no pueda ver una sola fila de ella.
--   · RLS no se aplica al dueño de la tabla, y tampoco si alguien añade una
--     política permisiva en el futuro sin mirar los grants.
--
-- Esta tabla la usa EXCLUSIVAMENTE el backend por la conexión Postgres de
-- servidor, que no es ni anon ni authenticated. No necesita políticas: no
-- hay ningún cliente legítimo al que concedérselas.

ALTER TABLE "VehicleImageUpload" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "VehicleImageUpload" FROM anon, authenticated;
