import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/components/legal/LegalDocument";
import { site } from "@/data/site";
import { canonical, socialMetadata } from "@/lib/seo";

const TITLE = "Política de Cookies";
const DESCRIPTION = "Tecnologías de almacenamiento que usa el sitio de MILLE Motor Culture.";
const UPDATED = "17 de octubre de 2026";
const VERSION = "2026-10-17";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: canonical("/cookies"),
  ...socialMetadata({ title: `${TITLE} | ${site.name}`, description: DESCRIPTION, path: "/cookies" }),
};

export default function CookiesPage() {
  return (
    <LegalDocument title={TITLE} updated={UPDATED} version={VERSION}>
      <LegalSection number="01" title="Qué encontramos">
        <p>El sitio público no usa cookies de analítica, publicidad, píxeles ni almacenamiento local o de sesión para seguimiento. No cargamos Google Analytics, Meta Pixel, mapas ni videos embebidos. Las fuentes tipográficas se sirven desde los archivos generados por Next.js; no se inserta un proveedor de fuentes en el navegador.</p>
        <p>La autenticación del panel privado usa cookies de sesión administradas por Supabase Auth. Solo se utilizan cuando el equipo inicia sesión en rutas de administración y son necesarias para autenticar solicitudes y proteger ese panel. El nombre y la duración concreta dependen de la configuración de sesión de Supabase; este proyecto no define una duración propia.</p>
      </LegalSection>

      <LegalSection number="02" title="Categoría y proveedor">
        <p><strong className="text-ink">Estrictamente necesarias:</strong> cookies de autenticación de Supabase Auth, únicamente para el panel interno. No son cookies de preferencias, analítica o marketing. En el sitio público no encontramos almacenamiento persistente en el navegador.</p>
        <p>Los clics a WhatsApp se cuentan con una solicitud propia al servidor y se almacenan en la base de datos; no usan cookies ni identificadores de navegador. El control antispam usa temporalmente la IP recibida en memoria del servidor, no en el navegador ni en una cookie.</p>
      </LegalSection>

      <LegalSection number="03" title="Consentimiento y preferencias">
        <p>La implementación auditada no instala tecnologías opcionales de analítica o publicidad que deban condicionarse desde un banner. Por eso no mostramos un gestor de preferencias. Las cookies de autenticación aparecen solo al acceder al panel y sirven para que funcione el inicio de sesión. El equipo puede cerrar la sesión desde el propio panel.</p>
        <p>Si el sitio incorpora una tecnología nueva de seguimiento o almacenamiento opcional, esta política debe actualizarse y el código debe impedir que se cargue antes de obtener la autorización correspondiente. Para dudas sobre datos personales, consulta la <a href="/privacidad">Política de Privacidad</a>.</p>
      </LegalSection>
    </LegalDocument>
  );
}
