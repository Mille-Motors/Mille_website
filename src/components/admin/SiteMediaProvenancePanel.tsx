"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleDashed } from "lucide-react";
import {
  ImageRightsForm,
  type ImageRightsDraft,
} from "@/components/admin/ImageRightsForm";
import { adminJson } from "@/lib/admin-client";
import {
  IMAGE_RIGHTS_ORIGIN_LABELS,
  IMAGE_SOURCE_TYPE_LABELS,
} from "@/lib/image-provenance";
import type { SiteMediaProvenance } from "@/types/provenance";

/**
 * La procedencia de las fotografías estructurales del sitio.
 *
 * La mayoría de los espacios siguen mostrando el archivo del repositorio, y
 * esos ya responden solos: su autor y su licencia están registrados en los
 * CREDITS.json desde que se descargaron y viven en código, junto al archivo.
 * Aquí solo hay que rellenar lo que alguien SUBIÓ, que es lo que nadie más
 * puede saber.
 *
 * Va en su propia sección y no dentro de cada tarjeta de imagen: subir,
 * encuadrar y recortar son el trabajo diario de esa pantalla, y añadir once
 * campos de derechos a cada tarjeta enterraría lo que se usa todos los días
 * debajo de lo que se rellena una vez.
 */
export function SiteMediaProvenancePanel({
  initial,
}: {
  initial: SiteMediaProvenance[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setEntries(initial);
  }

  async function save(key: string, rights: ImageRightsDraft) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await adminJson<{ provenance: SiteMediaProvenance[] }>(
      `/api/admin/site-media/${encodeURIComponent(key)}/provenance`,
      "PATCH",
      { rights },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setEntries(result.data.provenance);
    setEditing(null);
    router.refresh();
  }

  const pending = entries.filter(
    (entry) => entry.resolved.status === "pending",
  ).length;

  return (
    <div className="grid gap-3">
      <p className="font-serif text-sm text-ink-muted">
        {pending === 0
          ? "Todos los espacios tienen procedencia documentada."
          : `${pending} ${pending === 1 ? "espacio" : "espacios"} sin procedencia registrada.`}{" "}
        Los que siguen mostrando el archivo original del repositorio la tienen
        ya registrada en el propio repositorio.
      </p>

      {error ? (
        <p role="alert" className="font-serif text-sm text-burgundy">
          {error}
        </p>
      ) : null}

      <ul className="grid gap-2">
        {entries.map((entry) => (
          <li key={entry.key} className="border border-stone bg-paper px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-serif text-sm text-ink">{entry.label}</p>
                {entry.resolved.status === "documented" ? (
                  <p className="mt-1 inline-flex items-center gap-2 font-serif text-xs text-ink-soft">
                    <CheckCircle2
                      aria-hidden
                      className="size-3.5 shrink-0 text-status-available"
                      strokeWidth={1.6}
                    />
                    {IMAGE_SOURCE_TYPE_LABELS[entry.resolved.rights.sourceType]}
                    {entry.resolved.rights.author
                      ? ` · ${entry.resolved.rights.author}`
                      : ""}
                    {entry.resolved.rights.licenseType
                      ? ` · ${entry.resolved.rights.licenseType}`
                      : ""}
                    <span className="text-ink-muted">
                      ({IMAGE_RIGHTS_ORIGIN_LABELS[entry.resolved.origin]})
                    </span>
                  </p>
                ) : (
                  <p className="mt-1 inline-flex items-center gap-2 font-serif text-xs text-ink-muted">
                    <CircleDashed
                      aria-hidden
                      className="size-3.5 shrink-0"
                      strokeWidth={1.6}
                    />
                    Procedencia pendiente de registrar.
                  </p>
                )}
              </div>

              {editing !== entry.key ? (
                <button
                  type="button"
                  onClick={() => setEditing(entry.key)}
                  className="label-caps shrink-0 rounded-xs border border-stone px-3 py-1.5 text-[10px] text-ink transition-colors hover:border-ink/40"
                >
                  {entry.own ? "Editar" : "Registrar"}
                </button>
              ) : null}
            </div>

            {editing === entry.key ? (
              <div className="mt-4 border-t border-stone pt-4">
                <ImageRightsForm
                  scope="slot"
                  initial={entry.own}
                  busy={busy}
                  onSubmit={(rights) => save(entry.key, rights)}
                  onCancel={() => setEditing(null)}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
