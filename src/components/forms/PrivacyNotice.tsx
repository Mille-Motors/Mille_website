import Link from "next/link";
import { cn } from "@/lib/cn";
import { DATA_PROCESSING_CONSENT, splitConsentText } from "@/lib/consent";

/**
 * La autorización de tratamiento de datos. Una casilla, y solo una.
 *
 * El texto NO se escribe aquí: viene de `DATA_PROCESSING_CONSENT`, que es el
 * mismo valor que el servidor guarda como prueba. Tenerlo escrito en el
 * componente —como estaba— significaba que la frase visible y la frase
 * guardada eran dos cadenas distintas que nadie obligaba a coincidir, y la
 * evidencia dejaba de poder demostrar qué se mostró. Ahora el enlace se
 * inserta PARTIENDO el texto, así que lo que se lee es carácter por carácter
 * lo que se guarda.
 *
 * Es una autorización, no una aceptación de documento. «Acepto la política de
 * privacidad» no autoriza nada: el art. 9 de la Ley 1581 de 2012 pide
 * consentimiento previo, expreso e informado para el TRATAMIENTO, y el art. 5
 * del Decreto 1377 de 2013 pide informar las finalidades específicas. De ahí
 * que el texto las enumere en vez de remitir a un documento.
 *
 * Sin preseleccionar —`defaultChecked` no existe aquí— y obligatoria:
 * `required` en el navegador y `z.literal(true)` en el servidor. El silencio
 * no puede equivaler a una conducta inequívoca, y el art. 7 del mismo decreto
 * lo dice expresamente.
 *
 * NO hay una segunda casilla de Términos ni una de marketing, y no es un
 * olvido. Enviar una consulta no celebra ningún contrato, así que exigir la
 * aceptación de los Términos sería pedir un consentimiento que no hace falta;
 * y MILLE no envía comunicaciones comerciales ni tiene con qué enviarlas, así
 * que una casilla de mercadeo sería decorativa. Cuando alguno de los dos
 * flujos exista, va en su propia casilla, separada y no preseleccionada.
 */
export function PrivacyNotice({
  className,
  error,
}: {
  className?: string;
  error?: string;
}) {
  const { before, link, after } = splitConsentText(DATA_PROCESSING_CONSENT);

  return (
    <div className={cn("text-[0.9375rem] leading-relaxed text-ink-muted", className)}>
      <label className="flex cursor-pointer items-start gap-3 text-left">
        <input
          className="mt-1 size-4 shrink-0 accent-burgundy"
          type="checkbox"
          name="privacyConsent"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "privacy-consent-error" : undefined}
        />
        <span>
          {before}
          {link ? (
            <Link
              href={DATA_PROCESSING_CONSENT.linkHref}
              target="_blank"
              rel="noreferrer"
              className="text-burgundy underline decoration-burgundy/40 underline-offset-2 transition-colors hover:decoration-burgundy"
            >
              {link}
            </Link>
          ) : null}
          {after}
        </span>
      </label>
      {error ? (
        <p id="privacy-consent-error" role="alert" className="mt-2 text-sm text-burgundy">
          {error}
        </p>
      ) : null}
    </div>
  );
}
