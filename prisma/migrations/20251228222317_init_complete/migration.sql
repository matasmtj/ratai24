-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('GUEST', 'USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."FuelType" AS ENUM ('PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID_HEV', 'HYBRID_PHEV');

-- CreateEnum
CREATE TYPE "public"."Gearbox" AS ENUM ('MANUAL', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "public"."BodyType" AS ENUM ('SEDAN', 'HATCHBACK', 'SUV', 'WAGON', 'COUPE', 'CONVERTIBLE', 'VAN', 'PICKUP');

-- CreateEnum
CREATE TYPE "public"."CarState" AS ENUM ('AVAILABLE', 'LEASED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."ContractState" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."City" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Car" (
    "id" SERIAL NOT NULL,
    "vin" TEXT NOT NULL,
    "numberPlate" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "pricePerDay" DOUBLE PRECISION NOT NULL,
    "cityId" INTEGER NOT NULL,
    "seatCount" INTEGER NOT NULL DEFAULT 5,
    "fuelType" "public"."FuelType" NOT NULL,
    "powerKW" INTEGER NOT NULL,
    "engineCapacityL" DOUBLE PRECISION,
    "bodyType" "public"."BodyType" NOT NULL,
    "gearbox" "public"."Gearbox" NOT NULL,
    "state" "public"."CarState" NOT NULL DEFAULT 'AVAILABLE',
    "odometerKm" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CarImage" (
    "id" SERIAL NOT NULL,
    "carId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contract" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "carId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "state" "public"."ContractState" NOT NULL DEFAULT 'ACTIVE',
    "mileageStartKm" INTEGER NOT NULL,
    "mileageEndKm" INTEGER,
    "fuelLevelStartPct" INTEGER NOT NULL,
    "fuelLevelEndPct" INTEGER,
    "extraFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phoneNumber" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RefreshToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contact" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContactOperationArea" (
    "id" SERIAL NOT NULL,
    "contactId" INTEGER NOT NULL,
    "cityId" INTEGER NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactOperationArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "City_name_key" ON "public"."City"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Car_vin_key" ON "public"."Car"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "Car_numberPlate_key" ON "public"."Car"("numberPlate");

-- CreateIndex
CREATE INDEX "CarImage_carId_idx" ON "public"."CarImage"("carId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "public"."RefreshToken"("token");

-- CreateIndex
CREATE INDEX "ContactOperationArea_contactId_idx" ON "public"."ContactOperationArea"("contactId");

-- CreateIndex
CREATE INDEX "ContactOperationArea_cityId_idx" ON "public"."ContactOperationArea"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactOperationArea_contactId_cityId_key" ON "public"."ContactOperationArea"("contactId", "cityId");

-- AddForeignKey
ALTER TABLE "public"."Car" ADD CONSTRAINT "Car_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CarImage" ADD CONSTRAINT "CarImage_carId_fkey" FOREIGN KEY ("carId") REFERENCES "public"."Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_carId_fkey" FOREIGN KEY ("carId") REFERENCES "public"."Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContactOperationArea" ADD CONSTRAINT "ContactOperationArea_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContactOperationArea" ADD CONSTRAINT "ContactOperationArea_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "public"."City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
