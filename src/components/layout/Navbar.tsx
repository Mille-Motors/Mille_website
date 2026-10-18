import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * La barra superior de cada página pública. Todo lo que hace vive en
 * `SiteHeader` —necesita saber en qué ruta está y si la página se ha
 * movido—, así que este componente de servidor no hace más que montarla.
 */
export function Navbar() {
  return <SiteHeader />;
}
