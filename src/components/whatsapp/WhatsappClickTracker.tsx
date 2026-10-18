"use client";

import { useEffect } from "react";
import { WHATSAPP_CLICK_ENDPOINT } from "@/lib/whatsapp-click";

/**
 * Cuenta los clics a WhatsApp sin tocar cada enlace.
 *
 * Un solo oyente en el documento: cualquier `<a data-wa-source="...">` que se
 * toque manda un aviso mínimo a `/api/whatsapp-click`. Así los enlaces
 * siguen siendo enlaces —incluidos los que viven en componentes de servidor,
 * como el pie— y marcar uno nuevo es añadir dos atributos.
 *
 * `sendBeacon` y no `fetch`: el clic abre WhatsApp en otra pestaña o en otra
 * app, y un `fetch` normal puede quedar cancelado en medio del salto. El aviso
 * es "dispara y olvida": si falla, la persona ni se entera y el enlace
 * funciona igual.
 *
 * Se manda lo que se tocó y desde dónde. Nada que identifique a nadie.
 */
export function WhatsappClickTracker() {
  useEffect(() => {
    function report(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLElement>("a[data-wa-source]");
      if (!link) return;

      const body = JSON.stringify({
        source: link.dataset.waSource,
        intent: link.dataset.waIntent,
        vehicleSlug: link.dataset.waSlug,
        path: window.location.pathname,
      });

      try {
        const sent = navigator.sendBeacon?.(
          WHATSAPP_CLICK_ENDPOINT,
          new Blob([body], { type: "application/json" }),
        );
        if (!sent) {
          void fetch(WHATSAPP_CLICK_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          }).catch(() => undefined);
        }
      } catch {
        // Medir nunca puede romper un clic.
      }
    }

    // `auxclick` recoge el clic con la rueda, que abre el enlace en otra
    // pestaña sin pasar por `click`.
    document.addEventListener("click", report);
    document.addEventListener("auxclick", report);
    return () => {
      document.removeEventListener("click", report);
      document.removeEventListener("auxclick", report);
    };
  }, []);

  return null;
}
