-- Encuadre por imagen del sitio.
--
-- No se recorta ningún archivo: el original sigue intacto en Storage y lo
-- único que se guarda es dónde mirar. El recorte lo hace el navegador con
-- object-fit: cover más object-position, así que la misma fotografía sirve
-- para el marco ancho del escritorio y para el casi cuadrado del teléfono.
--
-- El valor por defecto es el centro, que es como el sitio se veía antes de
-- que esta columna existiera: las filas que ya estaban no cambian de
-- apariencia al aplicar esta migración.

ALTER TABLE "SiteMedia"
  ADD COLUMN "focalX" DOUBLE PRECISION NOT NULL DEFAULT 50,
  ADD COLUMN "focalY" DOUBLE PRECISION NOT NULL DEFAULT 50;

-- El encuadre es un porcentaje. Fuera de 0–100 no significa nada, y dejarlo
-- entrar convertiría un error de la aplicación en una fotografía en blanco.
ALTER TABLE "SiteMedia"
  ADD CONSTRAINT "SiteMedia_focalX_range" CHECK ("focalX" >= 0 AND "focalX" <= 100),
  ADD CONSTRAINT "SiteMedia_focalY_range" CHECK ("focalY" >= 0 AND "focalY" <= 100);
