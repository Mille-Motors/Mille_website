/**
 * La identidad del equipo interno, tal como la ven las pantallas.
 *
 * Vive fuera de src/server porque los componentes de cliente la necesitan y
 * ese módulo lleva `server-only`: importar el tipo desde allí funcionaría
 * hoy, pero ata una pantalla del navegador a un archivo que nunca debe
 * acabar en su bundle.
 */
export interface AdminSession {
  authUserId: string;
  email: string;
  adminUserId: string;
  name: string | null;
}

/**
 * Lo que espera respuesta, para los avisos numéricos del menú lateral. Vive
 * aquí y no junto a la consulta porque el menú es un componente de cliente.
 */
export interface AdminNavBadges {
  newInquiries: number;
  privacyOpen: number;
  privacyOverdue: number;
}
