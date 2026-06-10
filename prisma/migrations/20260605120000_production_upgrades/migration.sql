-- Contact rekvizitai
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "companyName" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "companyCode" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "bankAccount" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "companyEmail" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "mainAddress" TEXT;

-- PartCondition enum and Part tables
DO $$ BEGIN
  CREATE TYPE "PartCondition" AS ENUM ('NEW', 'USED', 'DAMAGED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Part" (
    "id" SERIAL NOT NULL,
    "partName" TEXT NOT NULL,
    "oemNumber" TEXT,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "colour" TEXT,
    "engineCapacityL" DOUBLE PRECISION,
    "powerKW" INTEGER,
    "fuelType" "FuelType",
    "gearbox" "Gearbox",
    "bodyType" "BodyType",
    "description" TEXT,
    "condition" "PartCondition" NOT NULL DEFAULT 'USED',
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PartImage" (
    "id" SERIAL NOT NULL,
    "partId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Part_make_model_idx" ON "Part"("make", "model");
CREATE INDEX IF NOT EXISTS "PartImage_partId_idx" ON "PartImage"("partId");

DO $$ BEGIN
  ALTER TABLE "PartImage" ADD CONSTRAINT "PartImage_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Legal pages CMS
CREATE TABLE IF NOT EXISTS "LegalPageContent" (
    "id" SERIAL NOT NULL,
    "pageKey" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalPageContent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LegalPageContent_pageKey_language_key" ON "LegalPageContent"("pageKey", "language");
