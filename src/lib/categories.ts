import type { VehicleCategory } from "@/types/vehicle";

/**
 * Category values are singular because they describe one vehicle. Browse
 * surfaces read better in plural, so the label lives here instead of being
 * special-cased at each call site.
 */
export const categoryPlural: Record<VehicleCategory, string> = {
  SUV: "SUV",
  "Sedán": "Sedanes",
  "Híbrido": "Híbridos",
  "Eléctrico": "Eléctricos",
  Deportivo: "Deportivos",
  Moto: "Motos",
};
