import { AdminTabs } from "@/components/admin/kit";

/**
 * Las dos caras de los datos personales, bajo una sola entrada del menú.
 *
 *   · Solicitudes de privacidad: personas que piden algo —ver, corregir o
 *     borrar sus datos— y un plazo de ley corriendo. Es trabajo.
 *   · Consentimientos: la prueba de lo que cada persona autorizó. Es archivo:
 *     se consulta cuando alguien discute o una autoridad pregunta.
 *
 * Siguen siendo dos pantallas, cada una con su URL, porque una se atiende y la
 * otra se consulta; lo que cambia es que ya no parecen tres cosas distintas
 * en el menú.
 */
export function PrivacyTabs({
  active,
}: {
  active: "solicitudes" | "consentimientos";
}) {
  return (
    <AdminTabs
      label="Privacidad"
      tabs={[
        {
          label: "Solicitudes de privacidad",
          href: "/admin/privacidad",
          active: active === "solicitudes",
        },
        {
          label: "Consentimientos",
          href: "/admin/consentimientos",
          active: active === "consentimientos",
        },
      ]}
    />
  );
}
