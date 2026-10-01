-- MILLE — una ruta registrada tiene que haber sido reservada por nosotros.
--
-- El navegador sube ahora directo a Supabase Storage y después pide a la API
-- que registre las rutas. La comprobación que había —que la ruta empezara
-- por `vehicles/<vehicleId>/`— limitaba el daño pero no demostraba nada:
-- cualquiera con la sesión podía inventarse `vehicles/<id>/loquesea.jpg` y
-- hacer que se registrara como fotografía del vehículo.
--
-- Esta tabla es el recibo. El servidor la escribe al reservar y la borra al
-- consumirla, así que una reserva vale exactamente una vez, caduca sola y
-- está atada a su vehículo.
--
-- Se eligió una tabla y no un token firmado porque el proyecto no tiene hoy
-- ningún secreto de aplicación: introducirlo obligaría a definir una
-- variable de entorno más en cada entorno, y olvidarla rompería las subidas
-- en producción sin avisar. Una fila con caducidad no tiene esa trampa.

CREATE TABLE "VehicleImageUpload" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "storagePath" TEXT NOT NULL,
    -- Lo que el navegador declaró al reservar. Si los bytes que suben no
    -- coinciden, la finalización rechaza: un PNG no puede acabar servido
    -- como JPEG por llevar esa extensión.
    "contentType" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleImageUpload_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VehicleImageUpload_storagePath_key" ON "VehicleImageUpload"("storagePath");
CREATE INDEX "VehicleImageUpload_vehicleId_idx" ON "VehicleImageUpload"("vehicleId");
CREATE INDEX "VehicleImageUpload_expiresAt_idx" ON "VehicleImageUpload"("expiresAt");

-- Borrar el vehículo se lleva sus reservas pendientes: no tendrían a qué
-- referirse.
ALTER TABLE "VehicleImageUpload"
  ADD CONSTRAINT "VehicleImageUpload_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Un mismo objeto del bucket no puede quedar registrado dos veces.
--
-- Es la segunda mitad de la garantía: la reserva impide registrar una ruta
-- que no emitimos, y esto impide registrar dos veces una que sí. Las
-- imágenes LEGACY viven en /public y tienen `storagePath` nulo; en Postgres
-- varios NULL no chocan entre sí, así que la restricción no las toca.
CREATE UNIQUE INDEX "VehicleImage_storagePath_key" ON "VehicleImage"("storagePath");
