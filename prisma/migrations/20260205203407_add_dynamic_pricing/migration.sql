-- AlterTable
ALTER TABLE "public"."Car" ADD COLUMN     "averageRevenuePerDay" DOUBLE PRECISION,
ADD COLUMN     "basePricePerDay" DOUBLE PRECISION,
ADD COLUMN     "dailyOperatingCost" DOUBLE PRECISION,
ADD COLUMN     "lastMaintenanceDate" TIMESTAMP(3),
ADD COLUMN     "lastUtilizationUpdate" TIMESTAMP(3),
ADD COLUMN     "maintenanceScore" DOUBLE PRECISION DEFAULT 100,
ADD COLUMN     "maxPricePerDay" DOUBLE PRECISION,
ADD COLUMN     "minPricePerDay" DOUBLE PRECISION,
ADD COLUMN     "monthlyFinancingCost" DOUBLE PRECISION,
ADD COLUMN     "nextMaintenanceKm" INTEGER,
ADD COLUMN     "purchasePrice" DOUBLE PRECISION,
ADD COLUMN     "useDynamicPricing" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "utilizationRate" DOUBLE PRECISION DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."Contract" ADD COLUMN     "appliedDiscount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "basePrice" DOUBLE PRECISION,
ADD COLUMN     "demandMultiplier" DOUBLE PRECISION,
ADD COLUMN     "durationDiscount" DOUBLE PRECISION,
ADD COLUMN     "dynamicPrice" DOUBLE PRECISION,
ADD COLUMN     "finalPrice" DOUBLE PRECISION,
ADD COLUMN     "pricingSnapshotId" INTEGER,
ADD COLUMN     "seasonalMultiplier" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "public"."PricingSnapshot" (
    "id" SERIAL NOT NULL,
    "carId" INTEGER NOT NULL,
    "cityId" INTEGER NOT NULL,
    "calculatedPrice" DOUBLE PRECISION NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "demandMultiplier" DOUBLE PRECISION NOT NULL,
    "seasonalMultiplier" DOUBLE PRECISION NOT NULL,
    "utilizationMultiplier" DOUBLE PRECISION NOT NULL,
    "durationMultiplier" DOUBLE PRECISION NOT NULL,
    "customerMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "finalPrice" DOUBLE PRECISION NOT NULL,
    "availableCars" INTEGER NOT NULL,
    "activeContracts" INTEGER NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CityDemandMetrics" (
    "id" SERIAL NOT NULL,
    "cityId" INTEGER NOT NULL,
    "totalCars" INTEGER NOT NULL,
    "availableCars" INTEGER NOT NULL,
    "activeContracts" INTEGER NOT NULL,
    "utilizationRate" DOUBLE PRECISION NOT NULL,
    "demandScore" DOUBLE PRECISION NOT NULL,
    "avgUtilization30d" DOUBLE PRECISION,
    "avgUtilization90d" DOUBLE PRECISION,
    "avgPriceMultiplier" DOUBLE PRECISION,
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CityDemandMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SeasonalFactor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "cityId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonalFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PricingRule" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "carId" INTEGER,
    "cityId" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "fixedPrice" DOUBLE PRECISION,
    "multiplier" DOUBLE PRECISION,
    "minPrice" DOUBLE PRECISION,
    "maxPrice" DOUBLE PRECISION,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PricingSnapshot_carId_createdAt_idx" ON "public"."PricingSnapshot"("carId", "createdAt");

-- CreateIndex
CREATE INDEX "PricingSnapshot_cityId_createdAt_idx" ON "public"."PricingSnapshot"("cityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CityDemandMetrics_cityId_key" ON "public"."CityDemandMetrics"("cityId");

-- CreateIndex
CREATE INDEX "CityDemandMetrics_lastCalculated_idx" ON "public"."CityDemandMetrics"("lastCalculated");

-- CreateIndex
CREATE INDEX "SeasonalFactor_startDate_endDate_isActive_idx" ON "public"."SeasonalFactor"("startDate", "endDate", "isActive");

-- CreateIndex
CREATE INDEX "PricingRule_startDate_endDate_isActive_idx" ON "public"."PricingRule"("startDate", "endDate", "isActive");

-- CreateIndex
CREATE INDEX "PricingRule_priority_idx" ON "public"."PricingRule"("priority");

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_pricingSnapshotId_fkey" FOREIGN KEY ("pricingSnapshotId") REFERENCES "public"."PricingSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PricingSnapshot" ADD CONSTRAINT "PricingSnapshot_carId_fkey" FOREIGN KEY ("carId") REFERENCES "public"."Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PricingSnapshot" ADD CONSTRAINT "PricingSnapshot_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CityDemandMetrics" ADD CONSTRAINT "CityDemandMetrics_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeasonalFactor" ADD CONSTRAINT "SeasonalFactor_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PricingRule" ADD CONSTRAINT "PricingRule_carId_fkey" FOREIGN KEY ("carId") REFERENCES "public"."Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PricingRule" ADD CONSTRAINT "PricingRule_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
