-- A person may choose either contact channel; do not require both phone and email.
ALTER TABLE "Inquiry"
    ALTER COLUMN "phone" DROP NOT NULL,
    ALTER COLUMN "email" DROP NOT NULL;
