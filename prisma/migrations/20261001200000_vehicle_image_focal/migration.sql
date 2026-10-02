-- MILLE — encuadre por fotografía de vehículo.
--
-- Misma estrategia que 20260914000200_site_media_focal, y a propósito: el
-- proyecto no debe tener dos formas distintas de encuadrar una imagen. No se
-- recorta ningún archivo, el original sigue intacto en Storage, y lo único
-- que se guarda es dónde mirar. El recorte lo hace el navegador con
-- `object-fit: cover` más `object-position`.
--
-- El valor por defecto es el centro, que es exactamente lo que `cover` hace
-- cuando nadie le dice nada. Las fotografías que ya estaban no cambian de
-- apariencia al aplicar esta migración, y nadie tiene que volver a encuadrar
-- un inventario entero.

ALTER TABLE "VehicleImage"
  ADD COLUMN "focalX" DOUBLE PRECISION NOT NULL DEFAULT 50,
  ADD COLUMN "focalY" DOUBLE PRECISION NOT NULL DEFAULT 50;

-- El encuadre es un porcentaje. Fuera de 0–100 no significa nada, y dejarlo
-- entrar convertiría un error de la aplicación en una fotografía en blanco.
ALTER TABLE "VehicleImage"
  ADD CONSTRAINT "VehicleImage_focalX_range" CHECK ("focalX" >= 0 AND "focalX" <= 100),
  ADD CONSTRAINT "VehicleImage_focalY_range" CHECK ("focalY" >= 0 AND "focalY" <= 100);

-- RLS y privilegios: "VehicleImage" ya está endurecida desde
-- 20260912000100_rls (RLS activo, sin políticas, sin grants para anon ni
-- authenticated). Añadir columnas no altera ninguna de las dos cosas, así
-- que no hay nada que repetir aquí. Se verifica contra la base, no se
-- supone.
