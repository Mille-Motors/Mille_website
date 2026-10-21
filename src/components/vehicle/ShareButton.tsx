"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Link2, Mail, Share2 } from "lucide-react";
import { FacebookIcon, WhatsappIcon } from "@/components/ui/BrandIcons";
import { cn } from "@/lib/cn";
import { canShareNatively, copyText, shareTargets, type ShareInput } from "@/lib/share";

/**
 * El botón «Compartir» de una ficha.
 *
 * En un teléfono abre la hoja de compartir del sistema, que ya trae las
 * aplicaciones de la persona —WhatsApp, Instagram, Mensajes…—. Donde esa hoja
 * no existe, abre un menú corto con copiar el enlace, WhatsApp, Facebook y
 * correo. Los dos caminos mandan el mismo enlace, que es la ficha misma: al
 * pegarse en otra aplicación sale la tarjeta de vista previa con su foto.
 *
 * Que una persona cierre la hoja del sistema sin elegir nada no es un error:
 * el navegador lo anuncia como `AbortError` y aquí se deja quieto. Cualquier
 * otro fallo sí cae al menú, para que compartir nunca se quede en un botón que
 * no hace nada.
 */
export function ShareButton({
  url,
  title,
  text,
  className,
  rootClassName,
}: ShareInput & { className?: string; rootClassName?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  // El menú se cierra al pulsar fuera y con Escape, que devuelve el foco al
  // botón: quien navega con teclado no se queda sin saber dónde estaba.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // El aviso de «copiado» dura lo justo para leerse.
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function onTrigger() {
    if (canShareNatively(typeof navigator === "undefined" ? undefined : navigator)) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // Cualquier otra cosa: se ofrece el menú en vez de no hacer nada.
      }
    }
    setOpen((value) => !value);
  }

  async function onCopy() {
    const done = await copyText(url);
    setCopied(done);
  }

  const targets = shareTargets({ url, title, text });
  const icon = { whatsapp: WhatsappIcon, facebook: FacebookIcon, email: Mail } as const;

  const row =
    "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-base text-ink transition-colors hover:bg-sand focus-visible:bg-sand";

  return (
    <div ref={root} className={cn("relative inline-block", rootClassName)}>
      <button
        ref={trigger}
        type="button"
        onClick={() => void onTrigger()}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={cn(
          "press inline-flex min-h-11 items-center gap-2.5 rounded-full border border-cream/30 px-5 text-base text-cream transition-colors hover:border-cream/60 hover:bg-cream/10",
          className,
        )}
      >
        <Share2 aria-hidden className="size-[1.125rem]" strokeWidth={1.5} />
        Compartir
      </button>

      {open ? (
        <div
          id={menuId}
          role="group"
          aria-label="Compartir esta ficha"
          className="absolute right-0 top-full z-30 mt-2 w-[17.5rem] rounded-2xl border border-ink/10 bg-paper p-1.5 text-ink shadow-[0_18px_40px_-12px_rgba(0,0,0,0.45)]"
        >
          <button type="button" onClick={() => void onCopy()} className={row}>
            {copied ? (
              <Check aria-hidden className="size-5 text-status-available" strokeWidth={1.6} />
            ) : (
              <Link2 aria-hidden className="size-5 text-ink-muted" strokeWidth={1.5} />
            )}
            {copied ? "Enlace copiado" : "Copiar enlace"}
          </button>

          {targets.map((target) => {
            const Icon = icon[target.id];
            return (
              <a
                key={target.id}
                href={target.href}
                // El correo se abre en la misma pestaña: es el programa de
                // correo quien lo recoge, no una página.
                {...(target.id === "email"
                  ? {}
                  : { target: "_blank", rel: "noreferrer noopener" })}
                onClick={() => setOpen(false)}
                className={row}
              >
                <Icon aria-hidden className="size-5 text-ink-muted" strokeWidth={1.5} />
                {target.label}
              </a>
            );
          })}

          <p className="px-3 pt-2 pb-2 text-sm leading-snug text-ink-muted">
            Para Instagram, copia el enlace y pégalo en una historia o un
            mensaje.
          </p>
          <span role="status" aria-live="polite" className="sr-only">
            {copied ? "Enlace copiado" : ""}
          </span>
        </div>
      ) : null}
    </div>
  );
}
