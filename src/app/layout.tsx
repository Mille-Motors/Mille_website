import type { Metadata, Viewport } from "next";
import { DM_Sans, EB_Garamond, Instrument_Serif } from "next/font/google";
import { Reveal } from "@/components/ui/Reveal";
import { site } from "@/data/site";
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

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "MILLE | Vehículos seleccionados en Bogotá",
    template: "%s | MILLE",
  },
  description: "Selección curada de vehículos premium en Bogotá.",
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "MILLE",
    title: "MILLE | Vehículos seleccionados en Bogotá",
    description: "Selección curada de vehículos premium en Bogotá.",
  },
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
        <Reveal />
      </body>
    </html>
  );
}
