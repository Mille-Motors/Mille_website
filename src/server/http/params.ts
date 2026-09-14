import { z } from "zod";
import { notFound } from "@/server/http/errors";

/**
 * Los identificadores de la API privada son UUID de Postgres.
 *
 * Sin validarlos, un id malformado llegaba tal cual a Prisma y Postgres
 * respondía `invalid input syntax for type uuid`: una excepción que la
 * frontera traducía a 500. Un 500 dice "se rompió algo nuestro" cuando lo
 * que pasa es que el recurso no puede existir.
 *
 * Se responde **404**, no 400, y la convención es la misma en todo el Admin:
 * un id que no es un UUID no identifica nada, igual que un UUID bien formado
 * que no está en la base. Distinguirlos solo serviría para confirmarle a
 * quien prueba que acertó con el formato. La pantalla de edición ya hacía
 * esto mismo por su cuenta; ahora lo hacen también los endpoints.
 */
const uuidSchema = z.uuid();

export function parseId(value: string, label = "Ese recurso"): string {
  const result = uuidSchema.safeParse(value);
  if (!result.success) throw notFound(`${label} no existe.`);
  return result.data;
}
