-- ---------------------------------------------------------------------------
-- «Camioneta»: SUV y 4x4 son una sola carrocería. Y «Van» deja de existir.
--
--    En Colombia lo que otros mercados llaman SUV se pide como «camioneta», y
--    «una 4x4» casi siempre quiere decir lo mismo. Tener dos cajones para esa
--    carrocería hacía que la portada, el filtro y el admin no coincidieran.
--    La pickup se queda aparte: lleva platón y es otra cosa.
--
--    Lo que distingue a una camioneta de otra —tracción 4x4, carácter
--    off-road— ya tiene su propia columna en el vehículo y no se toca.
--
--    Idempotente: se puede volver a correr sin efecto.
-- ---------------------------------------------------------------------------

-- 1. La fila «SUV» pasa a ser «Camioneta». Conserva su id, su posición y todos
--    los vehículos que cuelgan de ella; solo cambian los textos y el slug.
--    Si alguien ya creó una «Camioneta» a mano, no se pisa: el paso 2 mueve
--    los vehículos a ella.
UPDATE "Category"
SET "name"       = 'Camioneta',
    "pluralName" = 'Camionetas',
    "slug"       = 'camioneta',
    "updatedAt"  = now()
WHERE "vehicleType" = 'AUTO'
  AND "slug" = 'suv'
  AND NOT EXISTS (
    SELECT 1 FROM "Category" other
    WHERE other."vehicleType" = 'AUTO'
      AND (other."slug" = 'camioneta' OR other."name" = 'Camioneta')
  );

-- 2. Los vehículos de las filas antiguas («SUV» si ya existía una «Camioneta»
--    aparte, y la «4x4» retirada) pasan a la camioneta vigente.
--
--    Los de «4x4» conservan su aviso de revisión: que estuvieran en esa
--    categoría no prueba que sean camionetas —una Hilux 4x4 es una pickup—, y
--    el formulario seguirá pidiendo que alguien lo confirme.
UPDATE "Vehicle" v
SET "categoryId" = target."id"
FROM "Category" old, "Category" target
WHERE v."categoryId" = old."id"
  AND old."vehicleType" = 'AUTO'
  AND old."slug" IN ('suv', '4x4')
  AND target."vehicleType" = 'AUTO'
  AND target."slug" = 'camioneta';

-- 3. Las filas antiguas que quedaron sin vehículos se borran: borrar una fila
--    de taxonomía vacía no destruye ningún dato, y dejarla sería basura
--    conceptual permanente.
DELETE FROM "Category" old
WHERE old."vehicleType" = 'AUTO'
  AND old."slug" IN ('suv', '4x4')
  AND EXISTS (
    SELECT 1 FROM "Category" target
    WHERE target."vehicleType" = 'AUTO' AND target."slug" = 'camioneta'
  )
  AND NOT EXISTS (SELECT 1 FROM "Vehicle" v WHERE v."categoryId" = old."id");

-- 4. El aviso de revisión que dejó la migración de taxonomía nombraba «SUV» y
--    «Van» entre las carrocerías posibles. Ahora se llama «Camioneta», y la
--    van ya no se ofrece.
UPDATE "Vehicle"
SET "reviewNote" = replace(
      "reviewNote",
      '(SUV, Sedán, Pickup, Hatchback, Coupé, Cabrio, Wagon o Van)',
      '(Camioneta, Sedán, Pickup, Hatchback, Coupé, Cabrio o Wagon)'
    )
WHERE "reviewNote" LIKE '%(SUV, Sedán, Pickup, Hatchback, Coupé, Cabrio, Wagon o Van)%';

-- 5. «Van»: MILLE no las vende, así que deja de ser una carrocería.
--
--    Si no tiene vehículos se borra; si alguien ya cargó uno, se DESACTIVA
--    —sale de la navegación y del formulario, pero la fila y su vehículo
--    siguen—, igual que se hizo con las categorías retiradas antes.
UPDATE "Category" c
SET "active" = false, "updatedAt" = now()
WHERE c."vehicleType" = 'AUTO'
  AND c."slug" = 'van'
  AND c."active"
  AND EXISTS (SELECT 1 FROM "Vehicle" v WHERE v."categoryId" = c."id");

DELETE FROM "Category" c
WHERE c."vehicleType" = 'AUTO'
  AND c."slug" = 'van'
  AND NOT EXISTS (SELECT 1 FROM "Vehicle" v WHERE v."categoryId" = c."id");
