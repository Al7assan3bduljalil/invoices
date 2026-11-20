-- CreateEnum
CREATE TYPE "LetterDirection" AS ENUM ('OUTGOING', 'INCOMING');

-- CreateEnum
CREATE TYPE "LetterStatus" AS ENUM ('DRAFT', 'SENT', 'CLOSED');

-- CreateTable
CREATE TABLE "Letter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "number" TEXT NOT NULL,
    "direction" "LetterDirection" NOT NULL DEFAULT 'OUTGOING',
    "status" "LetterStatus" NOT NULL DEFAULT 'DRAFT',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subject" TEXT NOT NULL,
    "party" TEXT NOT NULL,
    "partyTitle" TEXT,
    "externalRef" TEXT,
    "body" TEXT NOT NULL,
    "signatory" TEXT,
    "cc" TEXT,
    "notes" TEXT,
    "createdByAI" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Letter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Letter_userId_number_key" ON "Letter"("userId", "number");

-- CreateIndex
CREATE INDEX "Letter_userId_direction_date_idx" ON "Letter"("userId", "direction", "date");

-- CreateIndex
CREATE INDEX "Letter_clientId_idx" ON "Letter"("clientId");

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
