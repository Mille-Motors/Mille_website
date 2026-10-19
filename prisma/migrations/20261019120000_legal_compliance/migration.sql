-- MILLE — evidencia de consentimiento, solicitudes de privacidad y
-- procedencia de las fotografías.
--
-- Toda la migración es ADITIVA: crea tipos, columnas nulables y dos tablas
-- nuevas, y copia filas de una tabla a otra. No borra ni una fila, no tira
-- ninguna tabla y no cambia el tipo de ninguna columna existente, así que el
-- código anterior sigue funcionando contra este esquema mientras un
-- despliegue tiene las dos versiones vivas.

-- ---------------------------------------------------------------------------
-- Vocabularios
-- ---------------------------------------------------------------------------

-- De quién es una fotografía. No se confunde con "ImageSource", que dice
-- dónde vive el archivo (/public o Storage): esto dice de dónde salió.
CREATE TYPE "ImageSourceType" AS ENUM ('OWN', 'OWNER', 'DEALER', 'PHOTOGRAPHER', 'STOCK', 'MANUFACTURER', 'OTHER');

-- Un solo tipo de consentimiento porque hay uno: ningún flujo del sitio pide
-- aceptar los Términos ni ofrece comunicaciones comerciales. Añadir TERMS o
-- MARKETING el día que exista el flujo es un ALTER TYPE de una línea.
CREATE TYPE "ConsentType" AS ENUM ('DATA_PROCESSING');

-- Sin DENIED: sin la casilla marcada el formulario no se envía, así que
-- nunca llega una negativa que registrar.
CREATE TYPE "ConsentAction" AS ENUM ('GRANTED', 'REVOKED');

-- Los derechos del art. 8 de la Ley 1581 de 2012, con los nombres de la ley.
CREATE TYPE "PrivacyRequestType" AS ENUM ('ACCESS', 'UPDATE', 'RECTIFICATION', 'DELETION', 'REVOCATION', 'PROOF_OF_CONSENT', 'USE_INFORMATION', 'COMPLAINT', 'OTHER');
CREATE TYPE "PrivacyRequestStatus" AS ENUM ('RECEIVED', 'IN_PROGRESS', 'NEEDS_INFO', 'ANSWERED', 'REJECTED', 'CLOSED');
CREATE TYPE "PrivacyRequestChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'OTHER');

-- ---------------------------------------------------------------------------
-- Procedencia de las fotografías
-- ---------------------------------------------------------------------------
--
-- Las mismas once columnas en tres sitios, y las tres veces nulables:
--
--   "Vehicle"      → el LOTE. Así llegan las fotos de un carro: todas del
--                    propietario, o todas del dealer.
--   "VehicleImage" → el override de UNA foto que viene de otra parte.
--   "SiteMedia"    → el espacio estructural, cuando se le sube una propia.
--
-- Nulo significa "nadie lo ha registrado", y eso NO bloquea nada: ni la
-- publicación, ni la subida, ni el sitio público. Las fotos que ya están
-- publicadas no reciben una autorización inventada por el hecho de existir.
--
-- Los archivos del repositorio (/public/images/…) no necesitan filas: su
-- procedencia ya está registrada en los CREDITS.json y vive en código, en
-- src/lib/image-provenance.ts. Copiarla aquí crearía dos verdades que se
-- pueden desincronizar del repositorio que describen.

ALTER TABLE "Vehicle"
    ADD COLUMN "rightsSourceType" "ImageSourceType",
    ADD COLUMN "rightsSourceName" TEXT,
    ADD COLUMN "rightsAuthor" TEXT,
    ADD COLUMN "rightsSourceUrl" TEXT,
    ADD COLUMN "rightsLicenseType" TEXT,
    ADD COLUMN "rightsLicenseUrl" TEXT,
    ADD COLUMN "rightsLicenseRequiresAttribution" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "rightsAcquiredOn" DATE,
    ADD COLUMN "rightsAuthorizedBy" TEXT,
    ADD COLUMN "rightsProofRef" TEXT,
    ADD COLUMN "rightsNotes" TEXT;

ALTER TABLE "VehicleImage"
    ADD COLUMN "rightsSourceType" "ImageSourceType",
    ADD COLUMN "rightsSourceName" TEXT,
    ADD COLUMN "rightsAuthor" TEXT,
    ADD COLUMN "rightsSourceUrl" TEXT,
    ADD COLUMN "rightsLicenseType" TEXT,
    ADD COLUMN "rightsLicenseUrl" TEXT,
    ADD COLUMN "rightsLicenseRequiresAttribution" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "rightsAcquiredOn" DATE,
    ADD COLUMN "rightsAuthorizedBy" TEXT,
    ADD COLUMN "rightsProofRef" TEXT,
    ADD COLUMN "rightsNotes" TEXT;

ALTER TABLE "SiteMedia"
    ADD COLUMN "rightsSourceType" "ImageSourceType",
    ADD COLUMN "rightsSourceName" TEXT,
    ADD COLUMN "rightsAuthor" TEXT,
    ADD COLUMN "rightsSourceUrl" TEXT,
    ADD COLUMN "rightsLicenseType" TEXT,
    ADD COLUMN "rightsLicenseUrl" TEXT,
    ADD COLUMN "rightsLicenseRequiresAttribution" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "rightsAcquiredOn" DATE,
    ADD COLUMN "rightsAuthorizedBy" TEXT,
    ADD COLUMN "rightsProofRef" TEXT,
    ADD COLUMN "rightsNotes" TEXT;

-- ---------------------------------------------------------------------------
-- ConsentEvent — evidencia de la decisión del Titular
-- ---------------------------------------------------------------------------
--
-- Qué se guarda y por qué: el art. 9 de la Ley 1581 de 2012 exige obtener la
-- autorización "por cualquier medio que pueda ser objeto de consulta
-- posterior" y su art. 17, lit. b) conservar copia de la autorización
-- otorgada. El art. 12 de la Ley 527 de 1999 da por cumplido un deber de
-- conservación cuando la información es accesible, se conserva en un formato
-- que reproduce con exactitud lo generado y se guardan origen, destino,
-- fecha y hora. De ahí "textSnapshot", "textHash", "source", "ipAddress" y
-- "createdAt".
--
-- "textVersion", "textHash" y "textSnapshot" admiten NULL por una sola razón:
-- las filas que se copian abajo desde "ConsentRecord" no los tienen, porque
-- cuando se guardaron no se registraba el texto. NULL se lee "prueba del
-- texto no disponible", que es la verdad. Rellenarlas con el texto de hoy
-- sería fabricar la prueba de que alguien leyó algo que todavía no existía.

CREATE TABLE "ConsentEvent" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inquiryId" UUID,
    "consentType" "ConsentType" NOT NULL,
    "action" "ConsentAction" NOT NULL,
    "source" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "textVersion" TEXT,
    "textHash" TEXT,
    "textSnapshot" TEXT,
    "ipAddress" TEXT,
    "ipSource" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ConsentEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConsentEvent_createdAt_idx" ON "ConsentEvent"("createdAt");
CREATE INDEX "ConsentEvent_consentType_action_idx" ON "ConsentEvent"("consentType", "action");
CREATE INDEX "ConsentEvent_source_idx" ON "ConsentEvent"("source");
CREATE INDEX "ConsentEvent_inquiryId_idx" ON "ConsentEvent"("inquiryId");

-- SET NULL y no CASCADE: borrar una solicitud no puede destruir la prueba de
-- que hubo una autorización. Y a la vez, un titular que pide supresión deja
-- de estar enlazado a ella: el evento sobrevive demostrando que hubo una
-- autorización de esta versión, a esta hora, desde este formulario, sin
-- conservar a quién ya pidió desaparecer.
ALTER TABLE "ConsentEvent"
    ADD CONSTRAINT "ConsentEvent_inquiryId_fkey"
    FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- El append-only, impuesto por la base
-- ---------------------------------------------------------------------------
--
-- No basta con que ningún código escriba un UPDATE: la evidencia vale lo que
-- valga la garantía de que no se pudo retocar, y "confiamos en que nadie lo
-- haga" no es una garantía. Un trigger sí lo es, y es lo que se le puede
-- enseñar a la SIC.
--
-- Se admite EXACTAMENTE una modificación: poner "inquiryId" a NULL, que es
-- lo que hace la clave ajena de arriba cuando se borra la solicitud. Se
-- comprueba comparando la fila entera con el "inquiryId" viejo puesto de
-- vuelta: si algo más cambió, la comparación lo detecta sin tener que
-- enumerar columna por columna y sin que añadir una columna nueva mañana
-- deje un agujero.
CREATE OR REPLACE FUNCTION public.consent_event_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION
            'ConsentEvent es append-only: la evidencia de una autorización no se borra. Para registrar una revocatoria, inserta un evento con action = REVOKED.';
    END IF;

    IF OLD."inquiryId" IS NOT NULL AND NEW."inquiryId" IS NULL THEN
        NEW."inquiryId" := OLD."inquiryId";
        IF ROW(NEW.*) IS DISTINCT FROM ROW(OLD.*) THEN
            RAISE EXCEPTION
                'ConsentEvent es append-only: solo se admite desvincular la solicitud, no modificar el evento.';
        END IF;
        NEW."inquiryId" := NULL;
        RETURN NEW;
    END IF;

    RAISE EXCEPTION
        'ConsentEvent es append-only: un evento ya registrado no se modifica.';
END;
$$;

REVOKE ALL ON FUNCTION public.consent_event_append_only() FROM public;

CREATE TRIGGER "consent_event_append_only"
    BEFORE UPDATE OR DELETE ON "ConsentEvent"
    FOR EACH ROW EXECUTE FUNCTION public.consent_event_append_only();

-- ---------------------------------------------------------------------------
-- La evidencia que ya existía
-- ---------------------------------------------------------------------------
--
-- "ConsentRecord" guardaba un "accepted = true" con la versión de la
-- política. Es prueba real de autorizaciones reales y por eso se copia; lo
-- que no tiene —el texto que se mostró, la IP— se queda en NULL, porque no
-- existe. Esto NO fabrica consentimientos retroactivos: no crea ni una fila
-- que no estuviera ya en la base.
--
-- La tabla original NO se tira. Tirarla destruiría la prueba primaria —lo
-- único que no se puede reponer— para no ganar nada, y rompería el envío de
-- formularios durante los minutos en que el código viejo y el esquema nuevo
-- coexisten en un despliegue. Queda congelada: nadie la escribe y el Admin
-- lee solo "ConsentEvent".
INSERT INTO "ConsentEvent" (
    "id", "createdAt", "inquiryId", "consentType", "action", "source",
    "policyVersion", "textVersion", "textHash", "textSnapshot",
    "ipAddress", "ipSource", "userAgent", "requestId", "metadata"
)
SELECT
    gen_random_uuid(),
    cr."acceptedAt",
    cr."inquiryId",
    'DATA_PROCESSING'::"ConsentType",
    'GRANTED'::"ConsentAction",
    cr."source",
    cr."privacyPolicyVersion",
    NULL, NULL, NULL,
    NULL, NULL, NULL, NULL,
    -- Marcado como lo que es, para que el Admin pueda decir en voz alta que
    -- de esta autorización no se conserva el texto exacto.
    jsonb_build_object(
        'legacy', true,
        'migratedFrom', 'ConsentRecord',
        'sourceRecordId', cr."id"::text,
        'evidence', 'TEXT_NOT_AVAILABLE'
    )
FROM "ConsentRecord" cr
WHERE cr."accepted" = true;

-- ---------------------------------------------------------------------------
-- PrivacyRequest — el expediente del trámite
-- ---------------------------------------------------------------------------
--
-- Esta sí se edita: es el estado de un trámite, no la evidencia de una
-- decisión. Quién lo tocó queda en "AdminAuditLog", que es el sitio de la
-- evidencia administrativa.
--
-- "dueOn" se guarda y no se recalcula al leer: el plazo se cuenta en días
-- hábiles colombianos desde el día siguiente al recibo (arts. 14 y 15 de la
-- Ley 1581 de 2012), y recalcularlo cada vez haría que corregir la tabla de
-- festivos moviera el vencimiento de un trámite ya abierto.
CREATE TABLE "PrivacyRequest" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "PrivacyRequestType" NOT NULL,
    "status" "PrivacyRequestStatus" NOT NULL DEFAULT 'RECEIVED',
    "channel" "PrivacyRequestChannel" NOT NULL,
    "receivedOn" DATE NOT NULL,
    "dueOn" DATE NOT NULL,
    "titularName" TEXT NOT NULL,
    "titularEmail" TEXT,
    "titularPhone" TEXT,
    "identityVerified" BOOLEAN NOT NULL DEFAULT false,
    "identityNote" TEXT,
    "subject" TEXT,
    "notes" TEXT,
    "response" TEXT,
    "closedAt" TIMESTAMPTZ(6),

    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrivacyRequest_status_dueOn_idx" ON "PrivacyRequest"("status", "dueOn");
CREATE INDEX "PrivacyRequest_createdAt_idx" ON "PrivacyRequest"("createdAt");
CREATE INDEX "PrivacyRequest_type_idx" ON "PrivacyRequest"("type");

-- Sin forma de responder no se puede atender un derecho, así que al menos
-- uno de los dos canales tiene que venir. Es la misma regla que ya aplica el
-- formulario público a teléfono y correo, aquí en la base.
ALTER TABLE "PrivacyRequest"
    ADD CONSTRAINT "PrivacyRequest_reachable"
    CHECK ("titularEmail" IS NOT NULL OR "titularPhone" IS NOT NULL);

-- ---------------------------------------------------------------------------
-- Data API de Supabase, cerrada en la MISMA migración que crea las tablas
-- ---------------------------------------------------------------------------
--
-- Mismo endurecimiento que el resto del esquema. Las dos tablas las usa
-- EXCLUSIVAMENTE el backend por la conexión Postgres de servidor, que no es
-- ni anon ni authenticated, así que no necesitan políticas: no hay ningún
-- cliente legítimo al que concedérselas. Con RLS activo y sin políticas
-- PostgREST no devuelve filas, y el REVOKE cierra además TRUNCATE —que RLS
-- no cubre nunca, y que sobre ConsentEvent esquivaría el trigger de arriba—
-- y protege contra una política permisiva añadida a ciegas.
--
-- Aquí no es una red de seguridad cualquiera: estas tablas tienen IPs,
-- nombres, teléfonos y correos de titulares que ejercen derechos.
ALTER TABLE "ConsentEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrivacyRequest" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "ConsentEvent" FROM anon, authenticated;
REVOKE ALL ON TABLE "PrivacyRequest" FROM anon, authenticated;
