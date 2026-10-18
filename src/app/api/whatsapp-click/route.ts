import { createRateLimiter } from "@/lib/rate-limiter";
import { clientKey } from "@/server/http/rate-limit";
import { fail, readJson } from "@/server/http/respond";
import { whatsappClickSchema } from "@/server/whatsapp/schemas";
import { recordWhatsappClick } from "@/server/whatsapp/service";

/**
 * Cuenta un clic al botón de WhatsApp.
 *
 * Siempre responde 204 cuando el aviso es válido, escriba o no: lo emite
 * `sendBeacon`, que no lee la respuesta, y a un cliente que solo mide no hay
 * por qué contarle si se alcanzó el tope o si la base falló. Los avisos
 * inválidos sí devuelven 400 como el resto de la API.
 *
 * Tope propio y más holgado que el del formulario: tocar el botón varias
 * veces es normal, y lo que se protege es que un script no llene la tabla.
 */
const limiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 40 });

export async function POST(request: Request) {
  try {
    const key = clientKey(request);
    const input = whatsappClickSchema.parse(await readJson(request, 2 * 1024));

    if (limiter.take(key)) {
      try {
        await recordWhatsappClick(input);
      } catch (error) {
        // Típico si la migración aún no está aplicada. Se registra y se sigue:
        // medir no puede producir un error visible.
        console.error("POST /api/whatsapp-click", error);
      }
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    return fail(error, "POST /api/whatsapp-click");
  }
}
