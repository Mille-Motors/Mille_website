-- MILLE — un borrador puede estar incompleto.
--
-- El problema que resuelve: no se podía subir una fotografía sin haber
-- rellenado antes marca, modelo, precio, kilometraje y descripción, porque
-- las imágenes cuelgan de un `Vehicle` que no se podía crear sin ellos. Eso
-- imponía un orden —primero el texto, después las fotos— que no existe en el
-- trabajo real: a un carro se le hacen las fotos antes de escribir nada.
--
-- La alternativa era un almacén temporal de imágenes sin vehículo, con su
-- propia caducidad y su propio riesgo de huérfanos. No hace falta: el modelo
-- YA distingue DRAFT de PUBLISHED, y "borrador incompleto" es exactamente lo
-- que DRAFT significa. Lo único que faltaba era que las columnas lo
-- permitieran.
--
-- Esto NO relaja la publicación. `publicationBlockers()` sigue exigiendo
-- marca, modelo, precio, kilometraje, descripción y al menos una fotografía,
-- y `assertPublishedInvariant()` lo comprueba dentro de cada transacción que
-- pueda romperlo. Lo que cambia es qué se puede GUARDAR, no qué se puede
-- PUBLICAR.
--
-- Migración puramente permisiva: no toca ni una fila, solo deja de prohibir.
-- Toda fila existente sigue siendo válida, porque todas tienen valor.

-- Marca, modelo y descripción admiten la cadena vacía, como ya hacían
-- `version`, `engine` y los colores. Vacío es un campo sin rellenar, no un
-- marcador inventado para esquivar el NOT NULL.
ALTER TABLE "Vehicle" ALTER COLUMN "make" SET DEFAULT '';
ALTER TABLE "Vehicle" ALTER COLUMN "model" SET DEFAULT '';
ALTER TABLE "Vehicle" ALTER COLUMN "description" SET DEFAULT '';

-- Precio y kilometraje admiten NULL, que es "todavía no se sabe".
--
-- En kilometraje la diferencia es real y no cosmética: 0 km es un valor
-- legítimo —un importado nuevo, una unidad sin uso— así que el cero no puede
-- hacer también de "sin rellenar". En precio, 0 ya era el valor que
-- `publicationBlockers()` leía como "falta el precio"; ahora la ausencia se
-- dice con NULL y el 0 deja de tener dos significados.
ALTER TABLE "Vehicle" ALTER COLUMN "price" DROP NOT NULL;
ALTER TABLE "Vehicle" ALTER COLUMN "mileage" DROP NOT NULL;
