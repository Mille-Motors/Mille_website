import type {
  PrivacyRequestChannel,
  PrivacyRequestStatus,
  PrivacyRequestTrack,
  PrivacyRequestType,
} from "@/lib/privacy-requests";

/**
 * Una solicitud de derechos del Titular, tal como la ve el Admin.
 *
 * Fuera de `src/server` porque la pintan componentes de cliente. No llega
 * nunca al sitio público: son nombres, correos y teléfonos de personas que
 * están ejerciendo un derecho.
 */
export interface PrivacyRequestView {
  id: string;
  createdAt: string;
  updatedAt: string;
  type: PrivacyRequestType;
  status: PrivacyRequestStatus;
  channel: PrivacyRequestChannel;
  /** `AAAA-MM-DD`: son días del calendario, no instantes. */
  receivedOn: string;
  dueOn: string;
  /** Consulta o reclamo. Se deduce del tipo; de ahí sale el plazo. */
  track: PrivacyRequestTrack;
  titularName: string;
  titularEmail: string | null;
  titularPhone: string | null;
  identityVerified: boolean;
  identityNote: string | null;
  subject: string | null;
  notes: string | null;
  response: string | null;
  closedAt: string | null;
  /**
   * Días hábiles que quedan hasta el vencimiento. Negativo significa
   * vencida. `null` cuando el trámite ya está cerrado y el plazo no corre.
   */
  businessDaysLeft: number | null;
}
