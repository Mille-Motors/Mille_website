-- MILLE — conteo de clics al botón de WhatsApp.
--
-- Una fila por clic: qué enlace se tocó, qué quería la persona, sobre qué
-- vehículo y desde qué página. Deliberadamente NO hay IP, agente de usuario ni
-- identificador de persona: el número sirve para saber si el botón se usa y
-- qué vehículos mueven más preguntas, no para seguir a nadie.
--
-- `vehicleSlug` es texto, no clave ajena: el conteo tiene que sobrevivir a que
-- el vehículo se archive o se borre.

CREATE TABLE "WhatsappClick" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "intent" TEXT,
    "vehicleSlug" TEXT,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappClick_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WhatsappClick_createdAt_idx" ON "WhatsappClick"("createdAt");
CREATE INDEX "WhatsappClick_vehicleSlug_createdAt_idx" ON "WhatsappClick"("vehicleSlug", "createdAt");

-- Endurecimiento de la Data API, en la MISMA migración que crea la tabla (en
-- 20261001180000 hubo que corregirlo aparte por haberlo olvidado).
--
-- Esta tabla la usa EXCLUSIVAMENTE el backend por la conexión Postgres de
-- servidor, que no es ni anon ni authenticated. No necesita políticas: no hay
-- ningún cliente legítimo al que concedérselas. Con RLS activo y sin políticas,
-- PostgREST no devuelve filas; el REVOKE cierra además TRUNCATE, que RLS no
-- cubre nunca, y protege contra una política permisiva añadida a ciegas.
ALTER TABLE "WhatsappClick" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "WhatsappClick" FROM anon, authenticated;
