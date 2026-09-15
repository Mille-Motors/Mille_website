/**
 * Single source of truth for contact details and navigation.
 * When the backend arrives these values move to configuration, not to JSX.
 *
 * `url` y `officialUrl` son hoy el mismo dominio oficial,
 * millemotorculture.com. Se conservan separados porque responden a preguntas
 * distintas: `url` es la base que necesita `metadataBase` para resolver URLs
 * absolutas, y `officialUrl` es el dominio de marca. Que el dominio sea
 * oficial no levanta el pre-launch: el sitio sigue sirviendo
 * `noindex, nofollow`.
 *
 * `phone` y `email` siguen en `null` hasta que MILLE tenga línea de WhatsApp
 * y buzón reales: no se muestra ningún número ni dirección de mentira como
 * si fuera un canal. Los componentes solo pintan un canal cuando su valor
 * aquí no es nulo, así que activar uno es cambiar este archivo y nada más.
 */
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
  phone: { number: string; display: string } | null;
} = {
  name: "MILLE",
  url: "https://millemotorculture.com",
  officialUrl: "https://millemotorculture.com",
  tagline: "House of Motor Culture",
  signature: "Drive a higher standard",
  city: "Bogotá",
  country: "Colombia",
  cityShort: "Bogotá, CO",
  email: null,
  instagram: {
    handle: "@millemotorculture",
    url: "https://www.instagram.com/millemotorculture/",
  },
  phone: null,
};

export const mainNav = [
  { label: "Vehículos", href: "/vehiculos" },
  { label: "Sobre MILLE", href: "/#mille" },
  { label: "Contacto", href: "/contacto" },
] as const;
