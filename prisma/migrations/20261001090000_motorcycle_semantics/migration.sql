-- MILLE — carro y moto dejan de ser el mismo formulario.
--
-- Hasta aquí una moto se describía con el vocabulario de un carro: se le
-- pedía tracción integral, se le ofrecía "Carrocería: ADV", se le guardaba un
-- color de interior que no tiene y se le exigía todo eso para publicarla. La
-- ficha técnica que cualquier revista publica de una moto —arquitectura del
-- motor, marchas, transmisión final— no cabía en ninguna columna.
--
-- Esta migración añade lo que faltaba, convierte lo que cambió de forma y no
-- borra ningún dato sin haberlo trasladado antes.

-- ---------------------------------------------------------------------------
-- 1. Lo que una moto sí publica.
-- ---------------------------------------------------------------------------

-- Cuántas marchas. Para los dos universos: una caja de ocho relaciones es
-- tan descriptiva en un X5 como las seis de una Multistrada. Sin valor por
-- defecto: "seis" es lo habitual en moto, pero habitual no es sabido.
ALTER TABLE "Vehicle" ADD COLUMN "gearCount" INTEGER;

-- Cadena, correa, cardán. Sustituye al selector de tracción en moto; en
-- carro se queda nulo y `drivetrain` sigue funcionando igual que siempre.
ALTER TABLE "Vehicle" ADD COLUMN "finalDrive" TEXT;

-- ---------------------------------------------------------------------------
-- 2. La placa deja de ser un dígito.
--
--    En carro lo era —es lo que mira el pico y placa— pero en moto los
--    formatos colombianos han cambiado con los años, y dar por hecho
--    "número + letra" dejaría fuera placas perfectamente válidas. Se pasa a
--    texto, que admite las dos cosas.
--
--    El valor viejo se copia ANTES de soltar la columna: un 7 sigue siendo
--    un "7".
-- ---------------------------------------------------------------------------

ALTER TABLE "Vehicle" ADD COLUMN "plateEnding" TEXT;

UPDATE "Vehicle"
SET "plateEnding" = "plateLastDigit"::text
WHERE "plateLastDigit" IS NOT NULL;

ALTER TABLE "Vehicle" DROP COLUMN "plateLastDigit";

-- ---------------------------------------------------------------------------
-- 3. El equipamiento deja de ser un catálogo de casillas.
--
--    Eran ochenta checkboxes más una lista de texto libre al lado. Buscar
--    una opción entre decenas de casillas resultaba más lento que
--    escribirla, y el catálogo no podía describir una suspensión Skyhook ni
--    unas pinzas Brembo Stylema: para motos no servía casi de nada.
--
--    Antes de soltar la columna, cada clave marcada se traduce a su etiqueta
--    y se añade al equipamiento en texto, agrupada bajo su sección. Nadie
--    pierde lo que había marcado; solo cambia cómo se edita.
--
--    La traducción va escrita aquí y no se lee del código a propósito: una
--    migración tiene que seguir dando el mismo resultado dentro de un año,
--    aunque el catálogo ya no exista en el repositorio.
-- ---------------------------------------------------------------------------

WITH catalog(key, section, label) AS (
  VALUES
    ('led-headlights', 'Exterior', 'Faros LED'),
    ('matrix-led', 'Exterior', 'Matrix LED'),
    ('laser-light', 'Exterior', 'Laser Light'),
    ('adaptive-headlights', 'Exterior', 'Faros adaptativos'),
    ('panoramic-roof', 'Exterior', 'Techo panorámico'),
    ('sunroof', 'Exterior', 'Sunroof'),
    ('soft-top', 'Exterior', 'Capota de lona'),
    ('hardtop', 'Exterior', 'Techo rígido retráctil'),
    ('alloy-wheels', 'Exterior', 'Rines de aleación'),
    ('forged-wheels', 'Exterior', 'Rines forjados'),
    ('aero-package', 'Exterior', 'Paquete aerodinámico'),
    ('roof-rails', 'Exterior', 'Barras de techo'),
    ('side-steps', 'Exterior', 'Estribos laterales'),
    ('spoiler', 'Exterior', 'Spoiler'),
    ('sport-exhaust', 'Exterior', 'Escape deportivo'),
    ('tow-hitch', 'Exterior', 'Enganche de arrastre'),
    ('privacy-glass', 'Exterior', 'Vidrios oscurecidos'),
    ('leather', 'Interior', 'Tapicería en cuero'),
    ('alcantara', 'Interior', 'Alcántara'),
    ('sport-seats', 'Interior', 'Asientos deportivos'),
    ('power-seats', 'Interior', 'Asientos eléctricos'),
    ('seat-memory', 'Interior', 'Memorias de asiento'),
    ('heated-seats', 'Interior', 'Asientos calefactados'),
    ('ventilated-seats', 'Interior', 'Asientos ventilados'),
    ('massage-seats', 'Interior', 'Asientos con masaje'),
    ('heated-steering', 'Interior', 'Volante calefactado'),
    ('ambient-lighting', 'Interior', 'Iluminación ambiental'),
    ('head-up-display', 'Interior', 'Head-up display'),
    ('third-row', 'Interior', 'Tercera fila de asientos'),
    ('wood-trim', 'Interior', 'Apliques en madera'),
    ('carbon-trim', 'Interior', 'Apliques en fibra de carbono'),
    ('climate-dual', 'Confort', 'Climatización bizona'),
    ('climate-tri', 'Confort', 'Climatización trizona'),
    ('climate-quad', 'Confort', 'Climatización cuatro zonas'),
    ('keyless-entry', 'Confort', 'Acceso sin llave'),
    ('keyless-start', 'Confort', 'Encendido por botón'),
    ('soft-close', 'Confort', 'Puertas soft close'),
    ('power-tailgate', 'Confort', 'Baúl eléctrico'),
    ('hands-free-tailgate', 'Confort', 'Baúl con apertura manos libres'),
    ('wireless-charging', 'Confort', 'Cargador inalámbrico'),
    ('rear-sunshade', 'Confort', 'Cortinilla trasera'),
    ('auto-wipers', 'Confort', 'Limpiaparabrisas con sensor de lluvia'),
    ('apple-carplay', 'Infotainment', 'Apple CarPlay'),
    ('android-auto', 'Infotainment', 'Android Auto'),
    ('navigation', 'Infotainment', 'Navegación'),
    ('digital-cluster', 'Infotainment', 'Cuadro de instrumentos digital'),
    ('touchscreen', 'Infotainment', 'Pantalla táctil central'),
    ('premium-audio', 'Infotainment', 'Sistema de sonido premium'),
    ('rear-entertainment', 'Infotainment', 'Entretenimiento trasero'),
    ('wifi-hotspot', 'Infotainment', 'Punto de acceso Wi-Fi'),
    ('rear-camera', 'Seguridad y asistencias', 'Cámara de reversa'),
    ('camera-360', 'Seguridad y asistencias', 'Cámara 360°'),
    ('park-sensors', 'Seguridad y asistencias', 'Sensores de parqueo'),
    ('park-assist', 'Seguridad y asistencias', 'Asistente de parqueo'),
    ('cruise-control', 'Seguridad y asistencias', 'Control crucero'),
    ('adaptive-cruise', 'Seguridad y asistencias', 'Control crucero adaptativo'),
    ('lane-assist', 'Seguridad y asistencias', 'Asistente de carril'),
    ('blind-spot', 'Seguridad y asistencias', 'Alerta de punto ciego'),
    ('aeb', 'Seguridad y asistencias', 'Frenado autónomo de emergencia'),
    ('cross-traffic', 'Seguridad y asistencias', 'Alerta de tráfico cruzado'),
    ('driver-attention', 'Seguridad y asistencias', 'Detector de fatiga'),
    ('tpms', 'Seguridad y asistencias', 'Monitoreo de presión de llantas'),
    ('isofix', 'Seguridad y asistencias', 'Anclajes ISOFIX'),
    ('adaptive-suspension', 'Performance', 'Suspensión adaptativa'),
    ('air-suspension', 'Performance', 'Suspensión neumática'),
    ('sport-differential', 'Performance', 'Diferencial deportivo'),
    ('sport-brakes', 'Performance', 'Frenos deportivos'),
    ('carbon-ceramic-brakes', 'Performance', 'Frenos carbono-cerámicos'),
    ('launch-control', 'Performance', 'Launch control'),
    ('drive-modes', 'Performance', 'Modos de conducción'),
    ('rear-axle-steering', 'Performance', 'Dirección al eje trasero'),
    ('limited-slip', 'Performance', 'Diferencial autoblocante'),
    ('paddle-shifters', 'Performance', 'Levas al volante'),
    ('low-range', 'Off-road', 'Caja reductora'),
    ('diff-lock', 'Off-road', 'Bloqueo de diferencial'),
    ('offroad-modes', 'Off-road', 'Modos off-road'),
    ('hill-descent', 'Off-road', 'Control de descenso'),
    ('underbody-protection', 'Off-road', 'Protecciones de bajos'),
    ('snorkel', 'Off-road', 'Snorkel'),
    ('winch', 'Off-road', 'Winche')
),
converted AS (
  SELECT
    v.id,
    array_agg(
      '[' || c.section || '] ' || c.label
      ORDER BY array_position(v."features", c.key)
    ) AS lines
  FROM "Vehicle" v
  JOIN catalog c ON c.key = ANY(v."features")
  WHERE array_length(v."features", 1) > 0
  GROUP BY v.id
)
UPDATE "Vehicle" v
SET "equipment" = converted.lines || v."equipment"
FROM converted
WHERE v.id = converted.id;

ALTER TABLE "Vehicle" DROP COLUMN "features";
