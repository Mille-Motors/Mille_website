"use client";

import { useEffect, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { buttonClass } from "@/components/admin/kit";
import { cn } from "@/lib/cn";
import { copyText, vehiclePublicUrl } from "@/lib/share";

/**
 * Copia el enlace público de una ficha.
 *
 * Es lo que el equipo necesita para compartir un vehículo en Instagram —en la
 * biografía, en una historia con enlace— o mandarlo por mensaje: la dirección
 * de MILLE, no la del admin. Solo se ofrece cuando el vehículo está publicado.
 */
export function CopyLinkButton({ slug, className }: { slug: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), 2200);
    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    <button
      type="button"
      onClick={async () => setState((await copyText(vehiclePublicUrl(slug))) ? "copied" : "failed")}
      className={cn(buttonClass, "px-4", className)}
    >
      {state === "copied" ? (
        <Check aria-hidden className="size-4 text-status-available" strokeWidth={1.6} />
      ) : (
        <Link2 aria-hidden className="size-4" strokeWidth={1.5} />
      )}
      {state === "copied"
        ? "Enlace copiado"
        : state === "failed"
          ? "No se pudo copiar"
          : "Copiar enlace"}
    </button>
  );
}
