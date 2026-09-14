import type { InquiryStatus } from "@/types/vehicle";

/**
 * Las tres bandejas de solicitudes.
 *
 * Una solicitud cerrada sigue siendo valiosa —es el historial de con quién se
 * habló— pero ya no es trabajo pendiente, y mezclarla con lo que sí hay que
 * atender convierte la bandeja en un archivo. Lo mismo con el spam.
 *
 * Por eso la pantalla se organiza por bandeja y no por estado: el estado es
 * un detalle del registro, la bandeja es la pregunta que se hace quien abre
 * la pantalla ("¿qué me falta por atender?").
 */
export const INQUIRY_VIEWS = ["activas", "cerradas", "spam"] as const;

export type InquiryView = (typeof INQUIRY_VIEWS)[number];

/** Qué estados componen cada bandeja. Ninguno queda fuera de las tres. */
export const inquiryViewStatuses: Record<InquiryView, readonly InquiryStatus[]> =
  {
    activas: ["new", "contacted"],
    cerradas: ["closed"],
    spam: ["spam"],
  };

export const inquiryViewLabels: Record<InquiryView, string> = {
  activas: "Activas",
  cerradas: "Cerradas",
  spam: "Spam",
};

/** La bandeja a la que pertenece un estado. */
export function viewForStatus(status: InquiryStatus): InquiryView {
  for (const view of INQUIRY_VIEWS) {
    if (inquiryViewStatuses[view].includes(status)) return view;
  }
  // Inalcanzable mientras las tres bandejas cubran todos los estados, y el
  // test lo comprueba. Si algún día se añade un estado, cae en la bandeja de
  // trabajo, que es donde alguien lo verá.
  return "activas";
}

export function isStatusInView(status: InquiryStatus, view: InquiryView): boolean {
  return inquiryViewStatuses[view].includes(status);
}

/** En estas bandejas la solicitud ya salió del flujo comercial. */
export function allowsDeletion(view: InquiryView): boolean {
  return view === "cerradas" || view === "spam";
}
