-- Minimal proof of the explicit privacy authorization submitted with an inquiry.
CREATE TABLE "ConsentRecord" (
    "id" UUID NOT NULL,
    "inquiryId" UUID NOT NULL,
    "consentType" TEXT NOT NULL DEFAULT 'privacy_treatment',
    "accepted" BOOLEAN NOT NULL DEFAULT true,
    "privacyPolicyVersion" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConsentRecord_inquiryId_key" ON "ConsentRecord"("inquiryId");
CREATE INDEX "ConsentRecord_acceptedAt_idx" ON "ConsentRecord"("acceptedAt");

ALTER TABLE "ConsentRecord"
    ADD CONSTRAINT "ConsentRecord_inquiryId_fkey"
    FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Matches the app's existing database boundary: public clients cannot use the
-- Supabase Data API for consent evidence. The app writes via Prisma server-side.
ALTER TABLE "ConsentRecord" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ConsentRecord" FROM anon, authenticated;
