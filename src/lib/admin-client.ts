/**
 * Llamadas del admin a su propia API.
 *
 * Las páginas del admin son componentes de servidor que leen de la base; las
 * mutaciones pasan por aquí y después llaman a `router.refresh()`, de modo
 * que la pantalla vuelve a pintarse con lo que la base realmente tiene y no
 * con lo que el navegador supone que pasó.
 *
 * Nunca lanza: devuelve el error para que cada pantalla lo muestre donde
 * corresponde.
 */
export type AdminResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fields?: Record<string, string> };

async function parse<T>(response: Response): Promise<AdminResult<T>> {
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
      message: error?.message ?? "La operación no se pudo completar.",
      fields: error?.fields,
    };
  }

  return {
    ok: true,
    data: (payload as { data: T } | null)?.data as T,
  };
}

export async function adminRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<AdminResult<T>> {
  try {
    const response = await fetch(path, {
      ...init,
      headers:
        init.body instanceof FormData
          ? init.headers
          : { "Content-Type": "application/json", ...init.headers },
    });
    return parse<T>(response);
  } catch {
    return {
      ok: false,
      message: "No pudimos conectar con el servidor. Inténtalo de nuevo.",
    };
  }
}

export const adminJson = <T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<AdminResult<T>> =>
  adminRequest<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
