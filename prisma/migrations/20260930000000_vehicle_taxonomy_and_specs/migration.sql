-- MILLE — normalización de la taxonomía y ficha técnica ampliada.
--
-- Escrita a mano y no generada por `migrate dev`: el shadow database que
-- `dev` levanta no tiene el esquema `auth` de Supabase, así que la migración
-- 20260912000100_rls no se puede replicar ahí. El DDL viene de
-- `prisma migrate diff`; lo que se añadió a mano es el orden y la migración
-- de datos, que es la parte que no se puede autogenerar.
--
-- Principio de toda esta migración: NO se pierde información y NO se inventa
-- ninguna. Cuando un dato antiguo permite deducir uno nuevo con certeza
-- —"categoría = Eléctrico" implica que el combustible es eléctrico— se
-- deduce. Cuando no —"categoría = Deportivo" no dice si el carro es un
-- sedán, un coupé o un hatchback— NO se adivina: se marca el vehículo para
-- que una persona lo decida, con `reviewNote`.

-- ---------------------------------------------------------------------------
-- 1. Columnas nuevas. Todas nulas o con defecto: ninguna fila existente se
--    invalida al añadirlas.
-- ---------------------------------------------------------------------------

ALTER TABLE "Vehicle"
ADD COLUMN     "engineLayout" TEXT,
ADD COLUMN     "cylinders" INTEGER,
ADD COLUMN     "displacementCc" INTEGER,
ADD COLUMN     "aspiration" TEXT,
ADD COLUMN     "powerHp" INTEGER,
ADD COLUMN     "torqueNm" INTEGER,
ADD COLUMN     "accel0100" DOUBLE PRECISION,
ADD COLUMN     "topSpeedKph" INTEGER,
ADD COLUMN     "topSpeedLimited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "topSpeedLimitedKph" INTEGER,
ADD COLUMN     "curbWeightKg" INTEGER,
ADD COLUMN     "icePowerHp" INTEGER,
ADD COLUMN     "iceTorqueNm" INTEGER,
ADD COLUMN     "electricMotorCount" INTEGER,
ADD COLUMN     "electricPowerHp" INTEGER,
ADD COLUMN     "electricTorqueNm" INTEGER,
ADD COLUMN     "electricMotorLayout" TEXT,
ADD COLUMN     "hybridSystem" TEXT,
ADD COLUMN     "batteryGrossKwh" DOUBLE PRECISION,
ADD COLUMN     "batteryNetKwh" DOUBLE PRECISION,
ADD COLUMN     "electricRangeKm" INTEGER,
ADD COLUMN     "rangeStandard" TEXT,
ADD COLUMN     "chargeAcKw" DOUBLE PRECISION,
ADD COLUMN     "chargeDcKw" DOUBLE PRECISION,
ADD COLUMN     "chargeConnector" TEXT,
ADD COLUMN     "chargeTimeNote" TEXT,
ADD COLUMN     "registrationCity" TEXT,
ADD COLUMN     "plateLastDigit" INTEGER,
ADD COLUMN     "soatValid" BOOLEAN,
ADD COLUMN     "soatExpiresOn" DATE,
ADD COLUMN     "techInspectionApplies" BOOLEAN,
ADD COLUMN     "techInspectionExpiresOn" DATE,
ADD COLUMN     "taxStatus" TEXT,
ADD COLUMN     "taxesPaidThroughYear" INTEGER,
ADD COLUMN     "documentationCheckedOn" DATE,
ADD COLUMN     "documentationNotes" TEXT,
ADD COLUMN     "funFactEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "funFactTitle" TEXT,
ADD COLUMN     "funFactBody" TEXT,
ADD COLUMN     "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "specialEquipment" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "reviewNote" TEXT;

-- ---------------------------------------------------------------------------
-- 2. `power` (texto libre, "340 hp") pasa a `powerHp` (entero).
--
--    Se rescata el número antes de soltar la columna. Un texto sin dígitos
--    ("Por confirmar") deja `powerHp` en NULL, que es exactamente lo que
--    significaba.
-- ---------------------------------------------------------------------------

UPDATE "Vehicle"
SET "powerHp" = NULLIF(regexp_replace("power", '[^0-9]', '', 'g'), '')::integer
WHERE "power" ~ '[0-9]'
  AND length(regexp_replace("power", '[^0-9]', '', 'g')) <= 5;

ALTER TABLE "Vehicle" DROP COLUMN "power";

-- ---------------------------------------------------------------------------
-- 3. Tracción: "4x4 (AWD)" mezclaba dos cosas distintas.
--
--    Se lee como integral (AWD), que es lo que era en la mayoría del
--    inventario. Los vehículos cuya CATEGORÍA era "4x4" se corrigen justo
--    después a 4WD, porque ahí sí hay una segunda señal que lo confirma.
-- ---------------------------------------------------------------------------

UPDATE "Vehicle" SET "drivetrain" = 'Integral (AWD)' WHERE "drivetrain" = '4x4 (AWD)';

-- ---------------------------------------------------------------------------
-- 4. Las carrocerías canónicas de carro. Idempotente por (vehicleType, slug).
--
--    `active` NO se toca al reencontrar una fila: si alguien la desactivó
--    desde el admin, esa decisión es más reciente que este archivo.
-- ---------------------------------------------------------------------------

INSERT INTO "Category" ("id", "name", "pluralName", "slug", "vehicleType", "active", "position", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'SUV',       'SUV',       'suv',       'AUTO', true, 0, now(), now()),
  (gen_random_uuid(), 'Sedán',     'Sedanes',   'sedan',     'AUTO', true, 1, now(), now()),
  (gen_random_uuid(), 'Pickup',    'Pickups',   'pickup',    'AUTO', true, 2, now(), now()),
  (gen_random_uuid(), 'Hatchback', 'Hatchbacks','hatchback', 'AUTO', true, 3, now(), now()),
  (gen_random_uuid(), 'Coupé',     'Coupés',    'coupe',     'AUTO', true, 4, now(), now()),
  (gen_random_uuid(), 'Cabrio',    'Cabrios',   'cabrio',    'AUTO', true, 5, now(), now()),
  (gen_random_uuid(), 'Wagon',     'Wagons',    'wagon',     'AUTO', true, 6, now(), now()),
  (gen_random_uuid(), 'Van',       'Vans',      'van',       'AUTO', true, 7, now(), now())
ON CONFLICT ("vehicleType", "slug") DO UPDATE
SET "name"       = EXCLUDED."name",
    "pluralName" = EXCLUDED."pluralName",
    "position"   = EXCLUDED."position",
    "updatedAt"  = now();

-- ---------------------------------------------------------------------------
-- 5. Rescatar lo que las categorías retiradas SÍ decían.
--
--    Cada una afirmaba algo cierto sobre el vehículo; lo que no afirmaba era
--    una carrocería. Se traslada esa verdad a la columna que le corresponde.
-- ---------------------------------------------------------------------------

-- "Eléctrico" era propulsión.
UPDATE "Vehicle" v
SET "fuelType" = 'Eléctrico'
FROM "Category" c
WHERE v."categoryId" = c."id"
  AND c."vehicleType" = 'AUTO' AND c."slug" = 'electrico'
  AND v."fuelType" <> 'Eléctrico';

-- "Híbrido" también. No se pisa un enchufable ni un MHEV ya declarados: son
-- más precisos que la etiqueta genérica de la que venimos.
UPDATE "Vehicle" v
SET "fuelType" = 'Híbrido'
FROM "Category" c
WHERE v."categoryId" = c."id"
  AND c."vehicleType" = 'AUTO' AND c."slug" = 'hibrido'
  AND v."fuelType" NOT IN ('Híbrido', 'Híbrido enchufable', 'Híbrido ligero (MHEV)');

-- "4x4" era tracción.
UPDATE "Vehicle" v
SET "drivetrain" = '4x4 (4WD)'
FROM "Category" c
WHERE v."categoryId" = c."id"
  AND c."vehicleType" = 'AUTO' AND c."slug" = '4x4'
  AND v."drivetrain" <> '4x4 (4WD)';

-- "Deportivo" era carácter.
UPDATE "Vehicle" v
SET "tags" = array_append(v."tags", 'Deportivo')
FROM "Category" c
WHERE v."categoryId" = c."id"
  AND c."vehicleType" = 'AUTO' AND c."slug" = 'deportivo'
  AND NOT ('Deportivo' = ANY(v."tags"));

-- ---------------------------------------------------------------------------
-- 6. Lo que NO se puede deducir queda marcado, no adivinado.
--
--    Un vehículo que estaba en "Deportivo" puede ser un sedán, un coupé o un
--    hatchback; uno que estaba en "Híbrido", cualquier cosa. Se conserva su
--    categoría actual —nada se borra, la ficha sigue completa— y se deja un
--    aviso que el formulario de administración muestra hasta que alguien
--    elija la carrocería de verdad.
-- ---------------------------------------------------------------------------

UPDATE "Vehicle" v
SET "reviewNote" =
      'Este vehículo estaba clasificado como «' || c."name" || '», que no es una carrocería. '
      || 'Elige su carrocería real (SUV, Sedán, Pickup, Hatchback, Coupé, Cabrio, Wagon o Van) '
      || 'y revisa que combustible, tracción y etiquetas hayan quedado bien.'
FROM "Category" c
WHERE v."categoryId" = c."id"
  AND c."vehicleType" = 'AUTO'
  AND c."slug" IN ('hibrido', 'electrico', 'deportivo', '4x4');

-- ---------------------------------------------------------------------------
-- 7. Retirar las categorías que no eran carrocerías.
--
--    Las que todavía tienen vehículos se DESACTIVAN: desaparecen de la
--    navegación, de los filtros y del selector de "crear vehículo", pero
--    siguen existiendo para que ninguna fila quede huérfana y para que quien
--    edite el vehículo vea de dónde venía. Las vacías se borran, porque
--    borrar una fila de taxonomía sin vehículos detrás no destruye ningún
--    dato y dejarla sería basura conceptual permanente.
-- ---------------------------------------------------------------------------

UPDATE "Category" c
SET "active" = false, "updatedAt" = now()
WHERE c."vehicleType" = 'AUTO'
  AND c."slug" IN ('hibrido', 'electrico', 'deportivo', '4x4')
  AND EXISTS (SELECT 1 FROM "Vehicle" v WHERE v."categoryId" = c."id");

DELETE FROM "Category" c
WHERE c."vehicleType" = 'AUTO'
  AND c."slug" IN ('hibrido', 'electrico', 'deportivo', '4x4')
  AND NOT EXISTS (SELECT 1 FROM "Vehicle" v WHERE v."categoryId" = c."id");

-- ---------------------------------------------------------------------------
-- 8. Índices para los filtros nuevos.
--
--    Solo sobre lo que el inventario público filtra de verdad. No hay índice
--    para `transmission` —cuatro valores sobre el inventario entero: el
--    planificador haría un seq scan igual— ni para `features`, que nadie
--    consulta: se lee junto con la ficha.
-- ---------------------------------------------------------------------------

CREATE INDEX "Vehicle_model_idx" ON "Vehicle"("model");
CREATE INDEX "Vehicle_availabilityStatus_idx" ON "Vehicle"("availabilityStatus");
CREATE INDEX "Vehicle_year_idx" ON "Vehicle"("year");
CREATE INDEX "Vehicle_price_idx" ON "Vehicle"("price");
CREATE INDEX "Vehicle_mileage_idx" ON "Vehicle"("mileage");
CREATE INDEX "Vehicle_fuelType_idx" ON "Vehicle"("fuelType");
CREATE INDEX "Vehicle_drivetrain_idx" ON "Vehicle"("drivetrain");
CREATE INDEX "Vehicle_city_idx" ON "Vehicle"("city");
CREATE INDEX "Vehicle_tags_idx" ON "Vehicle" USING GIN ("tags");
