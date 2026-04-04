-- Optional per-car control of utilization-based price adjustment
ALTER TABLE "Car" ADD COLUMN "applyUtilizationPricing" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Car" ADD COLUMN "utilizationMultiplierOverride" DOUBLE PRECISION;
