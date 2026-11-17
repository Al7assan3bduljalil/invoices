-- AlterTable: Add stampUrl and signatureUrl to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stampUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signatureUrl" TEXT;

-- AlterTable: Add shareToken to Invoice
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "shareToken" TEXT;

-- Backfill shareToken for existing rows
UPDATE "Invoice" SET "shareToken" = gen_random_uuid()::text WHERE "shareToken" IS NULL;

-- AlterColumn: Make shareToken NOT NULL and unique
ALTER TABLE "Invoice" ALTER COLUMN "shareToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_shareToken_key" ON "Invoice"("shareToken");
