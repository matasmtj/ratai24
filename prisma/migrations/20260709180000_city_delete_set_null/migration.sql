-- Allow city deletion while preserving historical pricing snapshots and rules.
ALTER TABLE "PricingSnapshot" DROP CONSTRAINT IF EXISTS "PricingSnapshot_cityId_fkey";
ALTER TABLE "PricingSnapshot" ALTER COLUMN "cityId" DROP NOT NULL;
ALTER TABLE "PricingSnapshot" ADD CONSTRAINT "PricingSnapshot_cityId_fkey"
  FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SeasonalFactor" DROP CONSTRAINT IF EXISTS "SeasonalFactor_cityId_fkey";
ALTER TABLE "SeasonalFactor" ADD CONSTRAINT "SeasonalFactor_cityId_fkey"
  FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PricingRule" DROP CONSTRAINT IF EXISTS "PricingRule_cityId_fkey";
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_cityId_fkey"
  FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
