import type { AdminVehicleQuery } from "@/server/vehicles/schemas";
import type { AdminInquiryQuery } from "@/server/inquiries/schemas";

/**
 * Las URLs canónicas de las pantallas del Admin.
 *
 * Viven aquí, en un módulo puro, porque las construyen los dos lados: los
 * componentes de cliente al navegar y las páginas de servidor al corregir
 * una página fuera de rango. Estaban exportadas desde los componentes, que
 * llevan `"use client"`, y eso no es un detalle de organización: al
 * importarlas desde un Server Component, React no entrega la función sino
 * una referencia de cliente, y llamarla revienta con "Attempted to call
 * adminVehiclesHref() from the server". El build no lo detecta porque esa
 * rama solo se ejecuta con sesión y con una página inexistente.
 *
 * Sin APIs de navegador: solo URLSearchParams, que existe en ambos lados.
 */
function append(params: URLSearchParams, key: string, value: unknown): void {
  if (value === undefined || value === null || value === "") return;
  params.set(key, String(value));
}

export function adminVehiclesHref(query: Partial<AdminVehicleQuery>): string {
  const params = new URLSearchParams();
  append(params, "q", query.q);
  append(params, "vehicleType", query.vehicleType);
  append(params, "publication", query.publication);
  append(params, "availability", query.availability);
  append(params, "make", query.make);
  append(params, "categoryId", query.categoryId);
  append(params, "minYear", query.minYear);
  append(params, "maxYear", query.maxYear);
  append(params, "minPrice", query.minPrice);
  append(params, "maxPrice", query.maxPrice);
  // El orden y la página por defecto no ensucian la URL.
  if (query.sort && query.sort !== "updated") append(params, "sort", query.sort);
  if (query.page && query.page > 1) append(params, "page", query.page);
  const qs = params.toString();
  return `/admin/vehiculos${qs ? `?${qs}` : ""}`;
}

export function adminInquiriesHref(query: Partial<AdminInquiryQuery>): string {
  const params = new URLSearchParams();
  // La bandeja de trabajo es la de por defecto.
  if (query.view && query.view !== "activas") append(params, "view", query.view);
  append(params, "status", query.status);
  append(params, "type", query.type);
  append(params, "vehicleType", query.vehicleType);
  append(params, "vehicleId", query.vehicleId);
  append(params, "q", query.q);
  if (query.page && query.page > 1) append(params, "page", query.page);
  const qs = params.toString();
  return `/admin/solicitudes${qs ? `?${qs}` : ""}`;
}
