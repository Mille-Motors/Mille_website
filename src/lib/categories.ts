import type { VehicleType } from "@/types/vehicle";

/**
 * Copy de los dos universos. Las categorías ya no viven aquí — vienen de la
 * base de datos y se administran desde /admin/categorias — pero cómo se
 * llaman "carros" y "motos" en la interfaz sí es una decisión editorial
 * fija, y sigue teniendo un solo sitio.
 */

/**
 * El copy público dice "carro", nunca "auto", "automóvil" ni "motocicleta".
 * El valor interno sigue siendo `auto` porque renombrar el modelo por una
 * decisión de copy no aporta nada.
 */
export const typeLabel: Record<VehicleType, string> = {
  auto: "Carros",
  moto: "Motos",
};

/** Sustantivos para los contadores: "1 carro", "6 motos". */
export const typeNoun: Record<VehicleType, { one: string; many: string }> = {
  auto: { one: "carro", many: "carros" },
  moto: { one: "moto", many: "motos" },
};
