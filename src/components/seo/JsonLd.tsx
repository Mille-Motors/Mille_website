import type { JsonLd as JsonLdData } from "@/lib/seo";

/**
 * Datos estructurados en la página.
 *
 * Es un `<script>` nativo y no `next/script`: JSON-LD es un dato, no código
 * que ejecutar, y tiene que estar en el HTML que el buscador lee de primeras.
 *
 * El `<` se escapa a `<` —la recomendación de la propia documentación de
 * Next— para que un texto del inventario que contenga `</script>` no pueda
 * cerrar la etiqueta y escribir HTML en la página. `JSON.stringify` no
 * protege de eso por su cuenta.
 */
export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
