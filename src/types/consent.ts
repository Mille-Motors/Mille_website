import type { ConsentAction, ConsentType } from "@/lib/consent";

/**
 * Un evento de consentimiento tal como lo ve el Admin.
 *
 * Vive fuera de `src/server` porque lo pintan componentes de cliente y ese
 * módulo lleva `server-only`. Nada de esto llega nunca al sitio público: son
 * IPs, agentes de usuario y datos de contacto de titulares.
 */
export interface ConsentEventView {
  id: string;
  createdAt: string;
  consentType: ConsentType;
  action: ConsentAction;
  source: string;
  policyVersion: string;
  /** Nulo en los eventos heredados de la primera forma de la prueba. */
  textVersion: string | null;
  textHash: string | null;
  textSnapshot: string | null;
  ipAddress: string | null;
  /** De qué cabecera salió la IP. Sin esto no se sabe cuánto vale. */
  ipSource: string | null;
  userAgent: string | null;
  requestId: string | null;
  inquiryId: string | null;
  /** `null` cuando la solicitud enlazada ya no existe. */
  titular: {
    name: string;
    email: string | null;
    phone: string | null;
    vehicleLabel: string | null;
  } | null;
  /** Si se puede demostrar QUÉ texto se mostró, y no solo que autorizó. */
  textEvidenceAvailable: boolean;
}
