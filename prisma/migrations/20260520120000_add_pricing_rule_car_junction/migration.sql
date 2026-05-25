-- CreateTable
CREATE TABLE "PricingRuleCar" (
    "pricingRuleId" INTEGER NOT NULL,
    "carId" INTEGER NOT NULL,

    CONSTRAINT "PricingRuleCar_pkey" PRIMARY KEY ("pricingRuleId","carId")
);

-- CreateIndex
CREATE INDEX "PricingRuleCar_carId_idx" ON "PricingRuleCar"("carId");

-- AddForeignKey
ALTER TABLE "PricingRuleCar" ADD CONSTRAINT "PricingRuleCar_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "PricingRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRuleCar" ADD CONSTRAINT "PricingRuleCar_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
