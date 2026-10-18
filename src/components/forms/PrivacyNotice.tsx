import Link from "next/link";
import { cn } from "@/lib/cn";

/** Explicit, separate authorization for the personal-data processing needed to answer an inquiry. */
export function PrivacyNotice({
  className,
  error,
}: {
  className?: string;
  error?: string;
}) {
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
          Autorizo el tratamiento de mis datos para atender esta solicitud, de
          acuerdo con la{" "}
          <Link
            href="/privacidad"
            target="_blank"
            rel="noreferrer"
            className="text-burgundy underline decoration-burgundy/40 underline-offset-2 transition-colors hover:decoration-burgundy"
          >
            Política de Privacidad
          </Link>
          . Conozco mis derechos y cómo ejercerlos en esa política.
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
