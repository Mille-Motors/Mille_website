-- Imágenes estructurales del sitio público.
--
-- Solo existe fila para los slots que alguien ya cambió desde el admin:
-- mientras un slot conserve su fotografía original, el sitio la lee del
-- registro en código (src/lib/site-media.ts). Por eso la tabla nace vacía y
-- quedarse sin ella no deja la home sin imágenes.
--
-- `key` es única porque un slot es un sitio concreto de la página: dos filas
-- para "home.hero" no significarían nada.

-- CreateTable
CREATE TABLE "SiteMedia" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storagePath" TEXT,
    "source" "ImageSource" NOT NULL DEFAULT 'STORAGE',
    "alt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteMedia_key_key" ON "SiteMedia"("key");

-- Misma política que el resto de tablas de negocio: la Data API de Supabase
-- no tiene por qué ver esto. La aplicación entra por conexión directa.
ALTER TABLE "SiteMedia" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "SiteMedia" FROM anon, authenticated;
