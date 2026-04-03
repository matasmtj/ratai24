// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Users
  const adminPass = await bcrypt.hash('Admin123!', 10);
  const userPass = await bcrypt.hash('User123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', passwordHash: adminPass, role: 'ADMIN' },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: { email: 'user@example.com', passwordHash: userPass, role: 'USER' },
  });

  // Cities
  const vilnius = await prisma.city.upsert({
    where: { name: 'Vilnius' },
    update: {},
    create: { name: 'Vilnius', country: 'LT' },
  });

  const kaunas = await prisma.city.upsert({
    where: { name: 'Kaunas' },
    update: {},
    create: { name: 'Kaunas', country: 'LT' },
  });

  // Cars — upsert by VIN (unique)
  const car1 = await prisma.car.upsert({
    where: { vin: 'JTDBR32E920123456' },
    update: {
      numberPlate: 'ABC123',
      pricePerDay: 35,
      seatCount: 5,
      fuelType: 'PETROL',
      powerKW: 97,
      engineCapacityL: 1.6,
      bodyType: 'SEDAN',
      gearbox: 'MANUAL',
      state: 'AVAILABLE',
      odometerKm: 60000,
      cityId: vilnius.id,
      make: 'Toyota',
      model: 'Corolla',
      year: 2020,
      colour: 'Silver',
      availableForLease: true,
      availableForSale: false, // Lease only
    },
    create: {
      vin: 'JTDBR32E920123456',
      numberPlate: 'ABC123',
      make: 'Toyota',
      model: 'Corolla',
      year: 2020,
      pricePerDay: 35,
      cityId: vilnius.id,
      seatCount: 5,
      fuelType: 'PETROL',
      powerKW: 97,
      engineCapacityL: 1.6,
      bodyType: 'SEDAN',
      gearbox: 'MANUAL',
      state: 'AVAILABLE',
      odometerKm: 60000,
      colour: 'Silver',
      availableForLease: true,
      availableForSale: false,
    },
  });

  const car2 = await prisma.car.upsert({
    where: { vin: '5YJ3E1EA7KF317000' },
    update: {
      numberPlate: 'EV-777',
      pricePerDay: 95,
      seatCount: 5,
      fuelType: 'ELECTRIC',
      powerKW: 208,
      engineCapacityL: null,
      bodyType: 'SEDAN',
      gearbox: 'AUTOMATIC',
      state: 'AVAILABLE',
      odometerKm: 15000,
      cityId: vilnius.id,
      make: 'Tesla',
      model: 'Model 3',
      year: 2022,
      colour: 'Pearl White',
      availableForLease: true,
      availableForSale: true,
      salePrice: 32000,
      saleDescription: 'Excellent condition Tesla Model 3. Low mileage, full autopilot, premium interior. One owner, complete service history.',
    },
    create: {
      vin: '5YJ3E1EA7KF317000',
      numberPlate: 'EV-777',
      make: 'Tesla',
      model: 'Model 3',
      year: 2022,
      pricePerDay: 95,
      cityId: vilnius.id,
      seatCount: 5,
      fuelType: 'ELECTRIC',
      powerKW: 208,
      engineCapacityL: null,
      bodyType: 'SEDAN',
      gearbox: 'AUTOMATIC',
      state: 'AVAILABLE',
      odometerKm: 15000,
      colour: 'Pearl White',
      availableForLease: true,
      availableForSale: true,
      salePrice: 32000,
      saleDescription: 'Excellent condition Tesla Model 3. Low mileage, full autopilot, premium interior. One owner, complete service history.',
    },
  });

  const car3 = await prisma.car.upsert({
    where: { vin: 'WVWZZZ1KZ6W000999' },
    update: {
      numberPlate: 'KKK-001',
      pricePerDay: 30,
      seatCount: 5,
      fuelType: 'PETROL',
      powerKW: 75,
      engineCapacityL: 1.4,
      bodyType: 'HATCHBACK',
      gearbox: 'MANUAL',
      state: 'AVAILABLE',
      odometerKm: 82000,
      cityId: kaunas.id,
      make: 'VW',
      model: 'Golf',
      year: 2018,
      colour: 'Blue',
      availableForLease: true,
      availableForSale: false,
    },
    create: {
      vin: 'WVWZZZ1KZ6W000999',
      numberPlate: 'KKK-001',
      make: 'VW',
      model: 'Golf',
      year: 2018,
      pricePerDay: 30,
      cityId: kaunas.id,
      seatCount: 5,
      fuelType: 'PETROL',
      powerKW: 75,
      engineCapacityL: 1.4,
      bodyType: 'HATCHBACK',
      gearbox: 'MANUAL',
      state: 'AVAILABLE',
      odometerKm: 82000,
      colour: 'Blue',
      availableForLease: true,
      availableForSale: false,
    },
  });

  // Add a car that's only for sale (not for lease)
  const car4 = await prisma.car.upsert({
    where: { vin: 'WBADT43452G000888' },
    update: {
      numberPlate: 'BMW-320',
      pricePerDay: 65,
      seatCount: 5,
      fuelType: 'DIESEL',
      powerKW: 140,
      engineCapacityL: 2.0,
      bodyType: 'SEDAN',
      gearbox: 'AUTOMATIC',
      state: 'AVAILABLE',
      odometerKm: 95000,
      cityId: vilnius.id,
      make: 'BMW',
      model: '320d',
      year: 2019,
      colour: 'Black',
      availableForLease: false,
      availableForSale: true, // Sale only
      salePrice: 18500,
      saleDescription: 'BMW 320d in excellent mechanical condition. Efficient diesel engine, automatic transmission. Perfect for highway driving.',
    },
    create: {
      vin: 'WBADT43452G000888',
      numberPlate: 'BMW-320',
      make: 'BMW',
      model: '320d',
      year: 2019,
      pricePerDay: 65,
      cityId: vilnius.id,
      seatCount: 5,
      fuelType: 'DIESEL',
      powerKW: 140,
      engineCapacityL: 2.0,
      bodyType: 'SEDAN',
      gearbox: 'AUTOMATIC',
      state: 'AVAILABLE',
      odometerKm: 95000,
      colour: 'Black',
      availableForLease: false,
      availableForSale: true,
      salePrice: 18500,
      saleDescription: 'BMW 320d in excellent mechanical condition. Efficient diesel engine, automatic transmission. Perfect for highway driving.',
    },
  });

  // Contracts (user leases car1)
  await prisma.contract.upsert({
    where: { id: 1 }, // simple id-based upsert for seed repeatability
    update: {},
    create: {
      userId: user.id,
      carId: car1.id,
      startDate: new Date('2025-09-01T00:00:00Z'),
      endDate: new Date('2025-09-05T00:00:00Z'),
      totalPrice: 35 * 4,
      state: 'ACTIVE',
      mileageStartKm: 60000,
      fuelLevelStartPct: 80,
      notes: 'Seed contract',
    },
  });

  // ========== DYNAMIC PRICING SYSTEM ==========
  console.log('\n🎯 Initializing Dynamic Pricing System...');

  // Update cars with pricing configuration
  await prisma.car.update({
    where: { id: car1.id },
    data: {
      basePricePerDay: 35,
      minPricePerDay: 25,
      maxPricePerDay: 60,
      useDynamicPricing: true,
      dailyOperatingCost: 5,
      monthlyFinancingCost: 90,
      purchasePrice: 15000,
      maintenanceScore: 85,
    },
  });

  await prisma.car.update({
    where: { id: car2.id },
    data: {
      basePricePerDay: 95,
      minPricePerDay: 70,
      maxPricePerDay: 150,
      useDynamicPricing: true,
      dailyOperatingCost: 12,
      monthlyFinancingCost: 750,
      purchasePrice: 48000,
      maintenanceScore: 95,
    },
  });

  await prisma.car.update({
    where: { id: car3.id },
    data: {
      basePricePerDay: 30,
      minPricePerDay: 22,
      maxPricePerDay: 50,
      useDynamicPricing: true,
      dailyOperatingCost: 4,
      monthlyFinancingCost: 60,
      purchasePrice: 12000,
      maintenanceScore: 78,
    },
  });

  // Seasonal Factors
  const summerSeason = await prisma.seasonalFactor.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Summer Peak Season',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-08-31'),
      multiplier: 1.3,
      isActive: true,
    },
  });

  const christmasSeason = await prisma.seasonalFactor.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Christmas Holiday',
      startDate: new Date('2026-12-20'),
      endDate: new Date('2027-01-05'),
      multiplier: 1.25,
      isActive: true,
    },
  });

  const easterSeason = await prisma.seasonalFactor.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Easter Holiday',
      startDate: new Date('2026-04-10'),
      endDate: new Date('2026-04-20'),
      multiplier: 1.2,
      isActive: true,
    },
  });

  // Sample Pricing Rule (March Promotion)
  const marchPromo = await prisma.pricingRule.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'March Spring Promotion',
      multiplier: 0.85,
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-31'),
      priority: 5,
      isActive: true,
    },
  });

  // Initialize city demand metrics
  await prisma.cityDemandMetrics.upsert({
    where: { cityId: vilnius.id },
    update: {},
    create: {
      cityId: vilnius.id,
      totalCars: 3,
      availableCars: 2,
      activeContracts: 1,
      utilizationRate: 0.33,
      demandScore: 0.65,
      avgUtilization30d: 0.42,
      avgUtilization90d: 0.38,
      avgPriceMultiplier: 1.05,
    },
  });

  await prisma.cityDemandMetrics.upsert({
    where: { cityId: kaunas.id },
    update: {},
    create: {
      cityId: kaunas.id,
      totalCars: 1,
      availableCars: 1,
      activeContracts: 0,
      utilizationRate: 0,
      demandScore: 0.6,
      avgUtilization30d: 0.15,
      avgUtilization90d: 0.18,
      avgPriceMultiplier: 0.95,
    },
  });

  console.log('✅ Dynamic Pricing System initialized');
  console.log('  - Cars configured: 3');
  console.log('  - Seasonal factors: 3');
  console.log('  - Pricing rules: 1');
  console.log('  - City demand metrics: 2');

  console.log('\n📊 Seeded:', {
    admin: admin.email,
    user: user.email,
    cities: [vilnius.name, kaunas.name],
    cars: [car1.vin, car2.vin, car3.vin, car4.vin],
    carsForSale: [car2.make + ' ' + car2.model, car4.make + ' ' + car4.model],
    dynamicPricing: 'enabled',
  });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
