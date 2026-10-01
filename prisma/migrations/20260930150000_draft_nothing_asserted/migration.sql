-- MILLE — un borrador no afirma nada que nadie haya elegido.
--
-- La migración anterior dejó que un borrador existiera sin marca, modelo,
-- precio, kilometraje ni descripción, pero seguía naciendo con carrocería,
-- combustible, transmisión, tracción y ciudad puestos: los primeros valores
-- de cada lista. El borrador creado solo para poder subir la foto de un 330e
-- quedaba guardado en la base como "Gasolina + AWD + SUV en Bogotá".
--
-- Nadie había elegido nada de eso. Era un dato inventado, escrito en disco,
-- que además se podía publicar sin que nadie volviera a mirarlo — justo lo
-- que el resto del proyecto evita a conciencia cuando prefiere no mostrar un
-- campo antes que rellenarlo.
--
-- Tampoco valía crear una carrocería "Pendiente": una fila falsa en la tabla
-- de taxonomía contaminaría los filtros públicos, la navegación por
-- categorías y la banda de la portada.
--
-- Así que la ausencia se representa como lo que es: NULL.
--
-- `vehicleType` NO se relaja, y es deliberado. No es un dato técnico del
-- vehículo sino el universo al que pertenece la ficha —carro o moto—; de él
-- dependen qué carrocerías se ofrecen y en qué listado aparece. Elegirlo no
-- afirma nada sobre la mecánica.
--
-- Esto NO relaja la publicación: la exigencia se mueve entera a
-- `publicationBlockers()`, que a partir de ahora pide los doce requisitos
-- —marca, modelo, carrocería, año, precio, kilometraje, combustible,
-- transmisión, tracción, ciudad, descripción y al menos una fotografía— y
-- que `assertPublishedInvariant()` hace cumplir dentro de cada transacción.
--
-- Migración puramente permisiva: no toca ni una fila. Todas las existentes
-- tienen valor en estas columnas, así que ninguna deja de ser válida, y
-- ninguna publicada deja de poder estarlo.

ALTER TABLE "Vehicle" ALTER COLUMN "year" DROP NOT NULL;
ALTER TABLE "Vehicle" ALTER COLUMN "fuelType" DROP NOT NULL;
ALTER TABLE "Vehicle" ALTER COLUMN "transmission" DROP NOT NULL;
ALTER TABLE "Vehicle" ALTER COLUMN "drivetrain" DROP NOT NULL;
ALTER TABLE "Vehicle" ALTER COLUMN "city" DROP NOT NULL;

-- La clave ajena se conserva intacta: sigue apuntando a `Category` con
-- ON DELETE RESTRICT, y en SQL una clave ajena nula simplemente no se
-- comprueba. Lo único que cambia es que ahora puede no haber carrocería.
ALTER TABLE "Vehicle" ALTER COLUMN "categoryId" DROP NOT NULL;
