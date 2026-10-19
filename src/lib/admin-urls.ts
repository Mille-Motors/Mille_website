import type { AdminVehicleQuery } from "@/server/vehicles/schemas";
import type { AdminInquiryQuery } from "@/server/inquiries/schemas";
import type { AdminConsentQuery } from "@/server/consent/schemas";
import type { AdminPrivacyQuery } from "@/server/privacy/schemas";

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

/**
 * Los filtros de la pantalla de consentimientos, en la URL.
 *
 * Que el filtro viaje en la URL no es cosmética aquí: significa que un
 * enlace a «las revocatorias de octubre» se puede guardar, compartir con un
 * abogado y volver a abrir, y que la exportación en CSV recibe EXACTAMENTE
 * el mismo filtro que la pantalla está mostrando.
 */
export function adminConsentHref(query: Partial<AdminConsentQuery>): string {
  const params = new URLSearchParams();
  append(params, "type", query.type);
  append(params, "action", query.action);
  append(params, "source", query.source);
  append(params, "from", query.from);
  append(params, "to", query.to);
  append(params, "q", query.q);
  if (query.page && query.page > 1) append(params, "page", query.page);
  const qs = params.toString();
  return `/admin/consentimientos${qs ? `?${qs}` : ""}`;
}

/** La misma URL, pero la descarga del CSV. */
export function adminConsentExportHref(
  query: Partial<AdminConsentQuery>,
): string {
  const href = adminConsentHref(query);
  const qs = href.includes("?") ? href.slice(href.indexOf("?")) : "";
  return `/api/admin/consent-events/export${qs}`;
}

export function adminPrivacyHref(query: Partial<AdminPrivacyQuery>): string {
  const params = new URLSearchParams();
  // La bandeja con el plazo corriendo es la de por defecto.
  if (query.view && query.view !== "abiertas") append(params, "view", query.view);
  append(params, "type", query.type);
  append(params, "status", query.status);
  append(params, "channel", query.channel);
  append(params, "q", query.q);
  if (query.page && query.page > 1) append(params, "page", query.page);
  const qs = params.toString();
  return `/admin/privacidad${qs ? `?${qs}` : ""}`;
}
