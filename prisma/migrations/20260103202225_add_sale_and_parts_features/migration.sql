-- CreateEnum
CREATE TYPE "public"."PartCondition" AS ENUM ('NEW', 'USED', 'REFURBISHED');

-- AlterTable
ALTER TABLE "public"."Car" ADD COLUMN     "availableForLease" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "availableForSale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "colour" TEXT,
ADD COLUMN     "salePrice" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "public"."Part" (
    "id" SERIAL NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "oem" TEXT NOT NULL,
    "partName" TEXT NOT NULL,
    "engineCapacityL" DOUBLE PRECISION,
    "powerKW" INTEGER,
    "fuelType" "public"."FuelType",
    "colour" TEXT,
    "gearbox" "public"."Gearbox",
    "bodyType" "public"."BodyType",
    "description" TEXT,
    "condition" "public"."PartCondition" NOT NULL DEFAULT 'USED',
    "price" DECIMAL(10,2) NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PartImage" (
    "id" SERIAL NOT NULL,
    "partId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Part_make_model_idx" ON "public"."Part"("make", "model");

-- CreateIndex
CREATE INDEX "Part_oem_idx" ON "public"."Part"("oem");

-- CreateIndex
CREATE INDEX "PartImage_partId_idx" ON "public"."PartImage"("partId");

-- AddForeignKey
ALTER TABLE "public"."PartImage" ADD CONSTRAINT "PartImage_partId_fkey" FOREIGN KEY ("partId") REFERENCES "public"."Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;
