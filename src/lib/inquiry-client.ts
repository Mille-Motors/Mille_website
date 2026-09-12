import type { InquiryType } from "@/types/vehicle";

/**
 * Envío de solicitudes desde el navegador.
 *
 * Devuelve un resultado, nunca lanza: los formularios necesitan pintar el
 * error donde toca, no capturar excepciones. Y el éxito solo es éxito si el
 * servidor confirmó que la fila existe.
 */
export interface InquiryFields {
  type: InquiryType;
  name: string;
  phone: string;
  email: string;
  message?: string;
  vehicleSlug?: string;
  source?: string;
  /** Campo trampa: si viene con algo, lo rellenó un bot. */
  website?: string;
}

export type InquiryResult =
  | { ok: true }
  | { ok: false; message: string; fields?: Record<string, string> };

export async function submitInquiry(
  fields: InquiryFields,
): Promise<InquiryResult> {
  try {
    const response = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const error =
        payload && typeof payload === "object" && "error" in payload
          ? (payload as {
              error: { message?: string; fields?: Record<string, string> };
            }).error
          : null;
      return {
        ok: false,
        message: error?.message ?? "No pudimos enviar tu mensaje.",
        fields: error?.fields,
      };
    }

    return { ok: true };
  } catch {
    // Red caída, DNS, offline. Nada de decir "enviado" por si acaso.
    return {
      ok: false,
      message: "No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.",
    };
  }
}

/** El input trampa: invisible para una persona, irresistible para un bot. */
export const honeypotProps = {
  type: "text" as const,
  tabIndex: -1,
  autoComplete: "off" as const,
  "aria-hidden": true,
  className:
    "absolute left-[-9999px] h-px w-px overflow-hidden opacity-0" as const,
};
