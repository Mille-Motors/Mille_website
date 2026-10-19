/**
 * Single source of truth for contact details and navigation.
 * When the backend arrives these values move to configuration, not to JSX.
 *
 * `url` y `officialUrl` son hoy el mismo dominio oficial,
 * millemotorculture.com. Se conservan separados porque responden a preguntas
 * distintas: `url` es la base que necesita `metadataBase` para resolver URLs
 * absolutas, y `officialUrl` es el dominio de marca. `url` es además la única
 * autoridad canónica del sitio: todo lo que lee un buscador —canonical, Open
 * Graph, robots, sitemap, JSON-LD— se construye a partir de aquí en
 * `src/lib/seo.ts`. La URL de Vercel sigue funcionando, pero no es canónica.
 *
 * `phone` es la línea de WhatsApp Business de MILLE (la misma que atiende el
 * equipo desde la app) y `email` es el buzón oficial, confirmado por el
 * fundador. Estuvo en `null` mientras no existió ninguno, porque no se
 * muestra una dirección de mentira como si fuera un canal; ahora existe, así
 * que se muestra. Lo que sigue sin inventarse son los buzones por función
 * —uno de privacidad, uno legal, uno de contacto—: no hay dominio de correo
 * propio, y una dirección que nadie lee no es un canal de atención. Una
 * prueba comprueba que no aparezca ninguno. El mismo buzón sirve
 * hoy de canal general y de canal electrónico para los derechos del titular;
 * eso está dicho en `src/lib/legal.ts`, que es de donde lo leen las páginas
 * legales.
 *
 * Los componentes solo pintan un canal cuando su valor aquí no es nulo, así
 * que activar uno es cambiar este archivo y nada más.
 *
 * `number` va en formato internacional, solo dígitos —sin `+`, espacios ni
 * guiones—: es lo que exige `wa.me`. `display` es lo que lee una persona.
 * `hours` es el horario real de atención por esa línea, en hora de Bogotá.
 */
export interface WhatsappHours {
  /** Hora local de Bogotá en que empieza la atención (0–23). */
  openHour: number;
  /** Hora local de Bogotá en que termina la atención (0–23). */
  closeHour: number;
  /** Como se escribe en pantalla. */
  label: string;
}

export const site: {
  name: string;
  url: string;
  officialUrl: string;
  tagline: string;
  signature: string;
  city: string;
  country: string;
  cityShort: string;
  email: string | null;
  instagram: { handle: string; url: string } | null;
  phone: { number: string; display: string; hours: WhatsappHours } | null;
} = {
  name: "MILLE",
  url: "https://millemotorculture.com",
  officialUrl: "https://millemotorculture.com",
  tagline: "House of Motor Culture",
  signature: "Drive a higher standard",
  city: "Bogotá",
  country: "Colombia",
  cityShort: "Bogotá, CO",
  email: "millemotorculture@gmail.com",
  instagram: {
    handle: "@millemotorculture",
    url: "https://www.instagram.com/millemotorculture/",
  },
  phone: {
    number: "573126385028",
    display: "+57 312 638 5028",
    hours: {
      openHour: 9,
      closeHour: 18,
      label: "Todos los días, de 9 a. m. a 6 p. m.",
    },
  },
};

/**
 * El menú del sitio. Los enlaces con `/#` saltan a una sección de la home:
 * cada una tiene su `id` en `src/app/(public)/(home)/page.tsx`.
 */
export const mainNav = [
  { label: "Vehículos", href: "/vehiculos" },
  { label: "Nuestra historia", href: "/#mille" },
  { label: "Vender con MILLE", href: "/#vender" },
  { label: "Cultura motor", href: "/#cultura" },
  { label: "Contacto", href: "/contacto" },
] as const;
