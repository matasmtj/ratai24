-- Internal calendar blocks for post-rental prep (cleaning day)
CREATE TABLE "CarPrepBlock" (
    "id" SERIAL NOT NULL,
    "carId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarPrepBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CarPrepBlock_carId_idx" ON "CarPrepBlock"("carId");
CREATE INDEX "CarPrepBlock_carId_startDate_endDate_idx" ON "CarPrepBlock"("carId", "startDate", "endDate");

ALTER TABLE "CarPrepBlock" ADD CONSTRAINT "CarPrepBlock_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
