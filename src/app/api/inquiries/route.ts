import { fail, created, readJson } from "@/server/http/respond";
import { clientKey, enforceRateLimit } from "@/server/http/rate-limit";
import { inquiryInputSchema } from "@/server/inquiries/schemas";
import { createInquiry } from "@/server/inquiries/service";

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
    enforceRateLimit(clientKey(request));

    const body = await readJson(request, 16 * 1024);
    const input = inquiryInputSchema.parse(body);
    const { inquiry, discarded } = await createInquiry(input);

    return created({ id: discarded ? null : inquiry.id, received: true });
  } catch (error) {
    return fail(error, "POST /api/inquiries");
  }
}
