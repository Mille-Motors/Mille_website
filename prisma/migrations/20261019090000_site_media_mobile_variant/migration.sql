-- MILLE — variante de teléfono y metadatos reales para las imágenes del sitio.
--
-- Qué cambia y por qué:
--
--   · `width/height/bytes/contentType` — el Admin no podía decir cuánto mide
--     de verdad el archivo que hay cargado, así que no podía avisar de que
--     una fotografía se iba a ver blanda. Ahora se anotan al subir.
--
--   · `mobileUrl` y compañía — la portada y «Vende con MILLE» se recortan
--     casi verticales en el teléfono y muy apaisadas en escritorio. Una sola
--     fotografía no resuelve bien las dos composiciones.
--
--   · `mobileFocalX/Y` — existe SIEMPRE, haya variante propia o no: con una
--     sola fotografía sigue siendo útil decir qué parte se ve en vertical.
--
-- Todo es aditivo y nullable. Ninguna fila existente cambia de aspecto:
--
--   · las columnas de escritorio no se tocan;
--   · `mobileUrl` nace nula, así que el teléfono sigue usando la de
--     escritorio exactamente como hasta ahora;
--   · el encuadre de teléfono nace en el centro, que es lo que `cover` hace
--     por su cuenta.
--
-- No se borra ni se mueve ningún objeto de Storage.

ALTER TABLE "SiteMedia"
  ADD COLUMN "width"       INTEGER,
  ADD COLUMN "height"      INTEGER,
  ADD COLUMN "bytes"       INTEGER,
  ADD COLUMN "contentType" TEXT,
  ADD COLUMN "mobileUrl"         TEXT,
  ADD COLUMN "mobileStoragePath" TEXT,
  ADD COLUMN "mobileWidth"       INTEGER,
  ADD COLUMN "mobileHeight"      INTEGER,
  ADD COLUMN "mobileBytes"       INTEGER,
  ADD COLUMN "mobileContentType" TEXT,
  ADD COLUMN "mobileFocalX" DOUBLE PRECISION NOT NULL DEFAULT 50,
  ADD COLUMN "mobileFocalY" DOUBLE PRECISION NOT NULL DEFAULT 50;

-- El encuadre es un porcentaje, igual que el de escritorio. Fuera de 0–100
-- no significa nada, y dejarlo entrar convertiría un error de la aplicación
-- en una fotografía en blanco.
ALTER TABLE "SiteMedia"
  ADD CONSTRAINT "SiteMedia_mobileFocalX_range" CHECK ("mobileFocalX" >= 0 AND "mobileFocalX" <= 100),
  ADD CONSTRAINT "SiteMedia_mobileFocalY_range" CHECK ("mobileFocalY" >= 0 AND "mobileFocalY" <= 100);

-- Las dimensiones son píxeles y el peso, bytes: cero o negativo no es un
-- dato, es un fallo de quien escribió la fila.
ALTER TABLE "SiteMedia"
  ADD CONSTRAINT "SiteMedia_size_positive" CHECK (
    ("width"  IS NULL OR "width"  > 0) AND
    ("height" IS NULL OR "height" > 0) AND
    ("bytes"  IS NULL OR "bytes"  > 0) AND
    ("mobileWidth"  IS NULL OR "mobileWidth"  > 0) AND
    ("mobileHeight" IS NULL OR "mobileHeight" > 0) AND
    ("mobileBytes"  IS NULL OR "mobileBytes"  > 0)
  );

-- RLS y privilegios: "SiteMedia" ya está endurecida desde
-- 20260914000000_site_media (RLS activo, sin políticas, sin grants para anon
-- ni authenticated). Añadir columnas no altera ninguna de las dos cosas.
