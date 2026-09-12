import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "@/server/http/errors";

/**
 * Una sola forma de respuesta para toda la API:
 *
 *   éxito  → { data: ... }
 *   fallo  → { error: { code, message, fields? } }
 *
 * Nada devuelve un objeto suelto ni un stacktrace.
 */
export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, { status: 200, ...init });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 });
}

interface ErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}

/** Aplana los errores de Zod a un mapa campo → primer mensaje. */
function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
}

/**
 * Traduce cualquier excepción a una respuesta. Lo inesperado se registra en
 * el servidor con contexto y sale como 500 sin detalles internos.
 */
export function fail(error: unknown, context: string): NextResponse<ErrorBody> {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: { code: error.code, message: error.message, fields: error.fields },
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Revisa los datos enviados.",
          fields: zodFields(error),
        },
      },
      { status: 400 },
    );
  }

  console.error(`[mille:${context}]`, error);
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Algo salió mal. Vuelve a intentarlo.",
      },
    },
    { status: 500 },
  );
}

/**
 * Lee el cuerpo JSON con un tope de tamaño. Sin esto, cualquiera puede
 * mandar megabytes a un endpoint público y obligarnos a parsearlos.
 */
export async function readJson(
  request: Request,
  maxBytes = 64 * 1024,
): Promise<unknown> {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) {
    throw new ApiError("PAYLOAD_TOO_LARGE", "El contenido es demasiado grande.");
  }

  const text = await request.text();
  if (text.length > maxBytes) {
    throw new ApiError("PAYLOAD_TOO_LARGE", "El contenido es demasiado grande.");
  }
  if (text.trim() === "") return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError("VALIDATION_ERROR", "El cuerpo no es JSON válido.");
  }
}
