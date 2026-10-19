import { createHash } from "node:crypto";
import {
  CONSENT_TEXTS,
  type ConsentTextDefinition,
  type ConsentType,
} from "@/lib/consent";

/**
 * El texto autoritativo de una autorización y su huella.
 *
 * Vive en `src/server` porque solo el servidor lo usa, pero NO lleva el
 * marcador `server-only` que llevan los servicios de al lado, y la excepción
 * es deliberada: aquí no hay base de datos, ni secretos, ni sesión —es una
 * función pura de una cadena a otra—, y `server-only` haría que las pruebas
 * unitarias no pudieran cargarlo. La evidencia de consentimiento es justo lo
 * que más falta hace poder comprobar en una prueba.
 *
 * Lo que sí protege la frontera es `node:crypto`: ningún componente de
 * cliente importa este archivo, porque el navegador necesita el texto —que
 * está en `@/lib/consent`, puro— y nunca la huella.
 *
 * Qué garantiza y qué no. La huella sirve para comprobar en un segundo que el
 * `textSnapshot` guardado en un evento es byte a byte el texto que decía esa
 * versión, sin comparar dos párrafos a ojo. Eso es lo que convierte «guardamos
 * el texto» en «podemos demostrar que es el texto». No es blockchain ni lo
 * pretende: no hay cadena, no hay sello de tiempo de un tercero, y una huella
 * no impide que alguien con acceso a la base cambie las dos columnas a la vez.
 * Contra eso está el trigger append-only de la tabla, que es la garantía de
 * verdad; esto es la comprobación barata.
 */
export function consentTextHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * El texto AUTORITATIVO de un tipo de consentimiento.
 *
 * El navegador manda «autoricé el tratamiento», no el texto. Si mandara el
 * texto, cualquiera podría guardar como prueba la frase que le conviniera, y
 * la evidencia dejaría de probar algo sobre MILLE para probar algo sobre quien
 * rellenó el formulario. El servidor lo resuelve de su propio registro.
 */
function authoritativeConsentText(
  consentType: ConsentType,
): ConsentTextDefinition {
  return CONSENT_TEXTS[consentType];
}

/** El texto, su versión y su huella, listos para escribir un evento. */
export function consentEvidenceFor(consentType: ConsentType): {
  textVersion: string;
  textSnapshot: string;
  textHash: string;
} {
  const definition = authoritativeConsentText(consentType);
  return {
    textVersion: definition.id,
    textSnapshot: definition.text,
    textHash: consentTextHash(definition.text),
  };
}
