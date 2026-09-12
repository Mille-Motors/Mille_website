import type { Metadata } from "next";

/**
 * El admin entero queda fuera de los buscadores. Esta capa no monta nada
 * más: la pantalla de login no debe llevar la barra lateral, así que el
 * armazón autenticado vive en el layout del grupo (panel).
 */
export const metadata: Metadata = {
  title: { default: "Administración", template: "%s | MILLE Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
