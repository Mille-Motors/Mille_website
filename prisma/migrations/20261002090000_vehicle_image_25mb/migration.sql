-- MILLE — los originales de vehículo pueden pesar hasta 25 MiB.
--
-- El tope eran diez, y rechazaba exactamente lo que este sistema pide
-- subir: un teléfono reciente produce originales de doce a veinte
-- mebibytes, y el proyecto guarda el archivo tal cual —ni se recomprime, ni
-- se redimensiona, ni se convierte de formato—. Pedir el original y
-- rechazarlo por pesar lo que pesa un original era contradictorio.
--
-- 26.214.400 = 25 * 1024 * 1024. El mismo número está en
-- `src/lib/image-dimensions.ts` como MAX_VEHICLE_IMAGE_BYTES, que es lo que
-- comprueban el navegador antes de empezar y el servidor al finalizar. Este
-- es el tercero y el único que no se puede esquivar: lo aplica Storage.
--
-- `site-media` NO cambia. Son cinco fotografías estructurales que se suben
-- por una petición multipart a través de Next, donde diez mebibytes son un
-- límite razonable y además protegen a la función serverless.
--
-- Solo se toca esa columna: ni la lista de tipos, ni el carácter público,
-- ni ninguna política. Y nada de `storage.objects`.

UPDATE storage.buckets
SET file_size_limit = 26214400
WHERE id = 'vehicle-images';
