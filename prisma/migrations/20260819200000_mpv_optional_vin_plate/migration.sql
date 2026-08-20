-- Add MPV (Vienatūris) body type
ALTER TYPE "BodyType" ADD VALUE 'MPV';

-- Make VIN and number plate optional
ALTER TABLE "Car" ALTER COLUMN "vin" DROP NOT NULL;
ALTER TABLE "Car" ALTER COLUMN "numberPlate" DROP NOT NULL;
