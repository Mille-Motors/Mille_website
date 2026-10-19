"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { SiteMediaVariantPanel } from "@/components/admin/SiteMediaVariantPanel";
import { Button } from "@/components/ui/Button";
import { adminJson } from "@/lib/admin-client";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import type { FocalPoint } from "@/lib/focal-point";
import type { SiteMediaEntry } from "@/types/site-media";

/** Qué archivo y con qué encuadre se está enseñando ahora mismo. */
const variantKey = (src: string, focal: FocalPoint) =>
  `${src}|${focal.x},${focal.y}`;

/**
 * Una tarjeta por espacio. Cada una enseña lo que está vivo ahora mismo, de
 * dónde sale y qué resolución necesita, porque recortar bien una fotografía
 * es la mitad del trabajo y tener resolución de sobra es la otra mitad.
 *
 * Los espacios con dos composiciones —la portada y «Vende con MILLE»— se
 * ven aquí uno al lado del otro: la pregunta útil no es «¿se ve bien?» sino
 * «¿se ve bien en los dos sitios?», y esa solo se puede contestar mirando
 * las dos a la vez.
 */
function SlotCard({ slot }: { slot: SiteMediaEntry }) {
  const router = useRouter();
  const [alt, setAlt] = useState(slot.alt);
  const [busy, setBusy] = useState<null | "alt" | "reset">(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const endpoint = `/api/admin/site-media/${encodeURIComponent(slot.key)}`;
  const changed = slot.desktop.source === "storage" || slot.mobile !== null;
  const mobileFrame = slot.frames.mobile;

  function saved(message: string) {
    setDone(message);
    setError(null);
    router.refresh();
  }

  async function saveAlt() {
    if (busy || alt.trim() === slot.alt) return;
    setBusy("alt");
    setError(null);
    setDone(null);
    const result = await adminJson(endpoint, "PATCH", { alt: alt.trim() });
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    saved("Texto alternativo guardado.");
  }

  async function reset() {
    if (busy) return;
    setBusy("reset");
    setError(null);
    setDone(null);
    const result = await adminJson(endpoint, "DELETE");
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setAlt(slot.alt);
    saved("Espacio devuelto a su fotografía original, centrada.");
  }

  return (
    <section
      className={cn(
        "border border-stone bg-paper p-5 sm:p-7",
        busy && "opacity-60",
      )}
      aria-busy={busy !== null}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-ink">{slot.label}</h2>
          <p className="label-caps mt-1.5 text-ink-muted">{slot.key}</p>
        </div>
        <span
          className={cn(
            "label-caps rounded-xs border px-2.5 py-1.5 text-[10px]",
            changed
              ? "border-status-available/30 bg-status-available/10 text-status-available"
              : "border-stone-strong/40 bg-sand text-ink-muted",
          )}
        >
          {changed ? "Personalizada" : "Original"}
        </span>
      </div>

      <p className="mt-3 max-w-2xl font-serif text-[0.9375rem] leading-relaxed text-ink-soft">
        {slot.description}
      </p>
      <p className="mt-2 max-w-2xl text-xs text-ink-muted">{slot.aspect}</p>
      {slot.updatedAt ? (
        <p className="mt-2 text-xs text-ink-muted">
          Última actualización: {formatDate(slot.updatedAt)}
        </p>
      ) : null}

      {/* Una fotografía decorativa se sirve con alt vacío a propósito, así
          que ofrecer el campo sería ofrecer un control que no cambia nada. */}
      {slot.decorative ? null : (
        <div className="mt-5 max-w-2xl">
          <label className="grid gap-2">
            <span className="label-caps text-ink-soft">Texto alternativo</span>
            <textarea
              value={alt}
              rows={2}
              onChange={(event) => setAlt(event.target.value)}
              className="w-full rounded-xs border border-stone bg-paper px-4 py-3 text-sm leading-relaxed text-ink transition-colors hover:border-stone-strong focus:border-burgundy focus:outline-none"
            />
            <span className="text-xs text-ink-muted">
              Describe la fotografía para quien no puede verla. No uses el
              nombre del archivo.
            </span>
          </label>
          <div className="mt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={
                busy !== null || alt.trim() === slot.alt || alt.trim().length < 3
              }
              onClick={() => void saveAlt()}
            >
              {busy === "alt" ? "Guardando…" : "Guardar texto"}
            </Button>
          </div>
        </div>
      )}

      <div
        className={cn(
          "mt-7 grid gap-7 border-t border-stone pt-6",
          mobileFrame && "lg:grid-cols-2 lg:gap-x-10",
        )}
      >
        <SiteMediaVariantPanel
          // La identidad de lo que se está viendo. Cuando el servidor
          // devuelve otro archivo u otro encuadre tras guardar, el borrador
          // local —encuadre a medias, archivo elegido, dimensiones medidas—
          // describe la fotografía ANTERIOR y no hay nada que conservar.
          // Montar de nuevo es la forma de React de decir eso, y solo pasa
          // después de un guardado: mientras se edita, las props no cambian.
          key={variantKey(slot.desktop.src, slot.desktop.focal)}
          slotKey={slot.key}
          variant="desktop"
          frame={slot.frames.desktop}
          file={slot.desktop}
          focal={slot.desktop.focal}
          inherited={false}
          recommendedVariant={false}
          recommendedMaxBytes={slot.recommendedMaxBytes}
          disabled={busy !== null}
          onSaved={saved}
        />

        {/* Sin marco de teléfono el espacio recorta igual en los dos
            tamaños: no hay segunda composición que revisar ni variante que
            subir, y ofrecerla sería inventar una decisión. */}
        {mobileFrame ? (
          <SiteMediaVariantPanel
            key={variantKey(
              (slot.mobile ?? slot.desktop).src,
              slot.mobileFocal,
            )}
            slotKey={slot.key}
            variant="mobile"
            frame={mobileFrame}
            file={slot.mobile ?? slot.desktop}
            focal={slot.mobileFocal}
            inherited={slot.mobile === null}
            recommendedVariant={slot.mobileVariantRecommended}
            recommendedMaxBytes={slot.recommendedMaxBytes}
            disabled={busy !== null}
            onSaved={saved}
          />
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-stone pt-5">
        <p className="mr-auto text-xs text-ink-muted">
          JPG, PNG, WebP o AVIF. Máx. 25 MB. El archivo se guarda entero: el
          recorte es solo de presentación.
        </p>
        {changed ? (
          <ConfirmButton
            question="Se volverá a la fotografía original del sitio y las que subiste se eliminarán definitivamente, incluida la variante de teléfono."
            confirmLabel="Sí, restaurar"
            disabled={busy !== null}
            onConfirm={() => void reset()}
            className="label-caps inline-flex h-9 items-center justify-center gap-2.5 rounded-xs border border-stone px-4 text-[10px] text-ink transition-colors hover:border-ink/40 disabled:pointer-events-none disabled:opacity-50"
          >
            <RotateCcw aria-hidden className="size-3.5" strokeWidth={1.5} />
            {busy === "reset" ? "Restaurando…" : "Restaurar original"}
          </ConfirmButton>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-burgundy">
          {error}
        </p>
      ) : null}
      {done ? <p className="mt-3 text-xs text-ink-muted">{done}</p> : null}
    </section>
  );
}

/** Los espacios agrupados como se piensan, no como están en el array. */
const GROUPS: { title: string; hint: string; match: (key: string) => boolean }[] =
  [
    {
      title: "Páginas",
      hint: "Las fotografías grandes de la home, contacto y la página de error.",
      match: (key) => key.startsWith("home.") || key.startsWith("contact.") || key.startsWith("error."),
    },
    {
      title: "Menú",
      hint: "La fotografía que acompaña a cada enlace al abrir el menú en escritorio. Cada una es independiente.",
      match: (key) => key.startsWith("nav."),
    },
    {
      title: "Compartir",
      hint: "Lo que se ve al pegar un enlace del sitio en WhatsApp o redes. 1.200 × 630 px en JPG ya es el tamaño óptimo. Al cambiarla, el sitio sirve la nueva al instante, pero una previsualización que WhatsApp ya guardó puede tardar en renovarse.",
      match: (key) => key.startsWith("seo."),
    },
  ];

export function SiteMediaAdmin({ media }: { media: SiteMediaEntry[] }) {
  return (
    <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <AdminPageHeader
        title="Imágenes del sitio"
        subtitle="Todas las fotografías que no pertenecen a un vehículo"
      />

      <p className="mb-8 max-w-2xl font-serif text-[0.9375rem] leading-relaxed text-ink-soft">
        Estos espacios están definidos en el diseño. Puedes cambiar la
        fotografía de cada uno, su encuadre y su texto alternativo; el cambio
        se ve en el sitio público de inmediato, sin volver a publicar. El
        archivo se guarda tal como lo subes: el recorte nunca lo modifica.
      </p>

      <div className="grid gap-10">
        {GROUPS.map((group) => {
          const slots = media.filter((slot) => group.match(slot.key));
          if (slots.length === 0) return null;
          return (
            <div key={group.title}>
              <h2 className="font-display text-xl text-ink">{group.title}</h2>
              <p className="mt-1.5 mb-5 max-w-2xl text-xs text-ink-muted">
                {group.hint}
              </p>
              <div className="grid gap-6">
                {slots.map((slot) => (
                  <SlotCard key={slot.key} slot={slot} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
