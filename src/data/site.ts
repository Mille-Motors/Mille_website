/**
 * Single source of truth for contact details and navigation.
 * When the backend arrives these values move to configuration, not to JSX.
 */
export const site = {
  name: "MILLE",
  url: "https://mille.com.co",
  tagline: "House of Motor Culture",
  signature: "Drive a higher standard",
  city: "Bogotá",
  country: "Colombia",
  cityShort: "Bogotá, CO",
  email: "info@mille.com.co",
  instagram: {
    handle: "@mille.co",
    url: "https://instagram.com/mille.co",
  },
  whatsapp: {
    /** Digits only, international format. Placeholder until the real line is provisioned. */
    number: "573000000000",
    display: "+57 300 000 0000",
  },
} as const;

export const mainNav = [
  { label: "Vehículos", href: "/vehiculos" },
  { label: "Sobre MILLE", href: "/#mille" },
  { label: "Contacto", href: "/contacto" },
] as const;
