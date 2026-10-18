import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { RevealObserver } from "@/components/motion/RevealObserver";
import { JsonLd } from "@/components/seo/JsonLd";
import { WhatsappClickTracker } from "@/components/whatsapp/WhatsappClickTracker";
import { WhatsappFloat } from "@/components/whatsapp/WhatsappFloat";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";

/**
 * Quién es MILLE y qué es este sitio, en cada página pública y en ninguna del
 * admin. Van aquí y no en el layout raíz por eso: es la frontera exacta entre
 * lo que se enseña a un buscador y lo que no.
 *
 * `public-site` sube el tamaño base del texto: es lo que separa el sitio
 * público del panel de administración, que comparte los mismos tokens.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="public-site flex min-h-dvh flex-col">
      <a href="#contenido" className="skip">
        Ir al contenido
      </a>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <Navbar />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <Footer />
      <WhatsappFloat />
      <WhatsappClickTracker />
      <RevealObserver />
    </div>
  );
}
