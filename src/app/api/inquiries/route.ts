import { fail, created, readJson } from "@/server/http/respond";
import {
  clientKey,
  enforceRateLimit,
  recordRateLimitHit,
} from "@/server/http/rate-limit";
import { inquiryInputSchema } from "@/server/inquiries/schemas";
import { createInquiry } from "@/server/inquiries/service";
import { requestEvidence } from "@/server/consent/service";

/**
 * El único endpoint que acepta escrituras de gente anónima.
 *
 * La respuesta 201 significa que la fila existe en la base: el formulario no
 * dice "recibimos tu mensaje" antes de que esto vuelva. Un envío detectado
 * como spam por el honeypot también responde 201, pero no escribe nada —
 * decirle a un bot que lo detectamos solo le enseña a esquivarlo.
 */
export async function POST(request: Request) {
  try {
    const key = clientKey(request);
    enforceRateLimit(key);

    const body = await readJson(request, 16 * 1024);
    const input = inquiryInputSchema.parse(body);
    // La IP sale de las cabeceras del proxy, aquí, en el servidor. El cuerpo
    // del formulario no tiene ningún campo de IP ni de hora, y es
    // deliberado: un dato que manda el navegador no prueba nada.
    const { inquiry, discarded } = await createInquiry(
      input,
      requestEvidence(request),
    );

    // Solo consume cupo lo que llegó a escribirse. Un formulario mal
    // rellenado no gasta los intentos de quien lo está rellenando bien, y un
    // envío descartado por el honeypot tampoco escribió nada.
    if (!discarded) recordRateLimitHit(key);

    return created({ id: discarded ? null : inquiry.id, received: true });
  } catch (error) {
    return fail(error, "POST /api/inquiries");
  }
}
