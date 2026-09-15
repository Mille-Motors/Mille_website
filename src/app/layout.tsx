import type { Metadata, Viewport } from "next";
import { DM_Sans, EB_Garamond, Instrument_Serif } from "next/font/google";
import { site } from "@/data/site";
import {
  PUBLIC_ROBOTS,
  SITE_DESCRIPTION,
  SITE_TITLE,
  socialMetadata,
} from "@/lib/seo";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-eb-garamond",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

/**
 * La metadata que hereda todo el sitio.
 *
 * `metadataBase` fija la única autoridad canónica —millemotorculture.com, sin
 * www— y es lo que resuelve cualquier ruta relativa a URL absoluta.
 *
 * No hay `alternates.canonical` aquí a propósito: un canonical en la raíz lo
 * heredarían todas las páginas, y el inventario entero acabaría diciendo que
 * la versión buena de sí mismo es la home. Cada página pública declara el
 * suyo.
 */
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: SITE_TITLE,
    template: `%s | ${site.name}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: site.name,
  ...socialMetadata({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    path: "/",
  }),
  // El sitio público se indexa. El admin se excluye en su propio layout, la
  // API por cabecera, y ambos además en /robots.txt.
  robots: PUBLIC_ROBOTS,
};

export const viewport: Viewport = {
  themeColor: "#f8f5ef",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es-CO"
      className={`${instrumentSerif.variable} ${ebGaramond.variable} ${dmSans.variable}`}
    >
      <body className="min-h-dvh bg-cream text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
