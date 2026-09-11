/**
 * Single source of truth for contact details and navigation.
 * When the backend arrives these values move to configuration, not to JSX.
 *
 * `officialUrl` is the eventual mille.com.co domain — not configured yet, so
 * nothing in the app should treat it as live. `phone`, `email` and
 * `instagram` are `null` until MILLE has a real WhatsApp line, inbox and
 * confirmed handle: no placeholder numbers or addresses are shown as if they
 * were real channels. Components only render a channel when its value here
 * is non-null.
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
  // QA-phase URL, used only where an absolute URL is technically required
  // (metadataBase). Not the public domain — that isn't configured yet.
  url: "https://mille-website-one.vercel.app",
  officialUrl: "https://mille.com.co",
  tagline: "House of Motor Culture",
  signature: "Drive a higher standard",
  city: "Bogotá",
  country: "Colombia",
  cityShort: "Bogotá, CO",
  email: null,
  instagram: null,
  phone: null,
};

export const mainNav = [
  { label: "Vehículos", href: "/vehiculos" },
  { label: "Sobre MILLE", href: "/#mille" },
  { label: "Contacto", href: "/contacto" },
] as const;
