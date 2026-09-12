/**
 * Errores de aplicación con un código estable.
 *
 * Los route handlers los traducen a una respuesta HTTP; nada más los
 * inspecciona. Cualquier otro error que llegue a la frontera se registra con
 * contexto y sale como 500 genérico: el cliente nunca ve un stacktrace.
 */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

const statusByCode: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  /** Errores por campo, para que el formulario los pueda pintar en su sitio. */
  readonly fields?: Record<string, string>;

  constructor(
    code: ApiErrorCode,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = statusByCode[code];
    this.fields = fields;
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new ApiError("VALIDATION_ERROR", message, fields);

export const unauthenticated = (message = "Necesitas iniciar sesión.") =>
  new ApiError("UNAUTHENTICATED", message);

export const forbidden = (message = "No tienes permisos para esta acción.") =>
  new ApiError("FORBIDDEN", message);

export const notFound = (message = "No encontramos lo que buscas.") =>
  new ApiError("NOT_FOUND", message);

export const conflict = (message: string, fields?: Record<string, string>) =>
  new ApiError("CONFLICT", message, fields);
