import type { Metadata, Viewport } from "next";
import { Barlow_Semi_Condensed, Gilda_Display } from "next/font/google";
import { site } from "@/data/site";
import {
  PUBLIC_ROBOTS,
  SITE_DESCRIPTION,
  SITE_TITLE,
  socialMetadata,
} from "@/lib/seo";
import "./globals.css";

/**
 * Una sola familia para todo el texto del sitio: una grotesca semicondensada
 * de trazo regular, de proporciones parecidas a las de las marcas de motor
 * alemanas que inspiran el diseño. El logotipo es el único texto en serif.
 */
const barlow = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-barlow",
  display: "swap",
});

const gilda = Gilda_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-gilda",
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

/**
 * Marca la página como "con script" antes del primer pintado. Es lo que
 * permite que las animaciones de entrada partan de oculto solo cuando de
 * verdad habrá script que las muestre: sin él, todo el contenido se ve.
 */
const MARK_SCRIPTED = "document.documentElement.classList.add('js')";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es-CO"
      className={`${barlow.variable} ${gilda.variable}`}
      // El script de arriba añade una clase a <html> antes de que React
      // hidrate; sin esto React lo tomaría por una diferencia.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: MARK_SCRIPTED }} />
      </head>
      <body className="min-h-dvh bg-cream text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
