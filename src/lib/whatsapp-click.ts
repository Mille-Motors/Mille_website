/**
 * El vocabulario del conteo de clics a WhatsApp, compartido entre el botón
 * que lo emite y el endpoint que lo valida. Vive en un módulo puro para que
 * ninguna de las dos mitades escriba una cadena a mano que la otra no conozca.
 *
 * Lo único que se cuenta es *qué* se tocó y *desde dónde*. No hay IP, ni
 * agente de usuario, ni identificador de persona: el número sirve para saber
 * si el botón se usa y cuáles vehículos mueven más preguntas, no para seguir a
 * nadie.
 */

/** De qué enlace salió el clic. */
export const WHATSAPP_CLICK_SOURCES = [
  "float", // botón flotante con menú
  "vehicle-float", // botón flotante en la ficha (escritorio)
  "vehicle-bar", // barra fija de la ficha (móvil)
  "vehicle-page", // botón dentro de la ficha
  "footer",
  "menu", // menú de pantalla completa
  "home", // botones de la home (vender con MILLE)
  "contact", // página de contacto
  "not-found",
] as const;
export type WhatsappClickSource = (typeof WHATSAPP_CLICK_SOURCES)[number];

/** Qué quería la persona. `vehiculo` es el mensaje de una ficha concreta. */
export const WHATSAPP_CLICK_INTENTS = [
  "general",
  "buscar",
  "vender",
  "cita",
  "vehiculo",
] as const;
export type WhatsappClickIntent = (typeof WHATSAPP_CLICK_INTENTS)[number];

/** Dónde se emite: un único endpoint, sin parámetros en la URL. */
export const WHATSAPP_CLICK_ENDPOINT = "/api/whatsapp-click";
