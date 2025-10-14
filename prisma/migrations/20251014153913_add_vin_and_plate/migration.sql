/*
  Warnings:

  - Added the required column `numberPlate` to the `Car` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vin` to the `Car` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Car" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vin" TEXT NOT NULL,
    "numberPlate" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "pricePerDay" REAL NOT NULL,
    "cityId" INTEGER NOT NULL,
    "seatCount" INTEGER NOT NULL DEFAULT 5,
    "fuelType" TEXT NOT NULL,
    "powerKW" INTEGER NOT NULL,
    "engineCapacityL" REAL,
    "bodyType" TEXT NOT NULL,
    "gearbox" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "odometerKm" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Car_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Car" ("bodyType", "cityId", "engineCapacityL", "fuelType", "gearbox", "id", "make", "model", "odometerKm", "powerKW", "pricePerDay", "seatCount", "state", "year") SELECT "bodyType", "cityId", "engineCapacityL", "fuelType", "gearbox", "id", "make", "model", "odometerKm", "powerKW", "pricePerDay", "seatCount", "state", "year" FROM "Car";
DROP TABLE "Car";
ALTER TABLE "new_Car" RENAME TO "Car";
CREATE UNIQUE INDEX "Car_vin_key" ON "Car"("vin");
CREATE UNIQUE INDEX "Car_numberPlate_key" ON "Car"("numberPlate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
