import type { VehicleType } from "@/types/vehicle";

/**
 * Lo ÚNICO que un vehículo nuevo trae puesto.
 *
 * Un borrador no afirma nada que nadie haya elegido. No hay valor por
 * defecto para combustible, transmisión, tracción, carrocería, ciudad ni
 * año: preseleccionar el primer elemento de cada lista hacía que un
 * borrador creado solo para subir la foto de un 330e quedara guardado en la
 * base como "Gasolina + AWD + SUV en Bogotá". Nadie había dicho eso, y un
 * dato inventado en disco es un dato inventado aunque la intención fuera
 * ahorrar clics.
 *
 * El tipo es la excepción, y es deliberada: no describe la mecánica del
 * vehículo sino el universo al que pertenece la ficha. De él dependen qué
 * carrocerías se ofrecen y en qué listado aparece, así que la pantalla
 * necesita uno para poder dibujarse. La inmensa mayoría del inventario son
 * carros, y cambiarlo es un clic visible en la propia pantalla.
 *
 * Vive aquí, y no dentro del formulario, porque el servidor crea el mismo
 * borrador cuando alguien sube una fotografía antes de escribir nada: las
 * dos caras tienen que partir del mismo sitio.
 */
export const DEFAULT_VEHICLE_TYPE: VehicleType = "auto";
