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

  // Parts — seed some sample car parts
  const part1 = await prisma.part.upsert({
    where: { id: 1 },
    update: {},
    create: {
      make: 'BMW',
      model: '320i',
      year: 2018,
      oem: '51117222222',
      partName: 'Front Bumper',
      condition: 'USED',
      price: 450.00,
      stockQuantity: 2,
      colour: 'Black',
      description: 'Good condition front bumper with minor scratches. Compatible with F30 series.',
      fuelType: 'PETROL',
      bodyType: 'SEDAN',
    },
  });

  const part2 = await prisma.part.upsert({
    where: { id: 2 },
    update: {},
    create: {
      make: 'Toyota',
      model: 'Corolla',
      year: 2020,
      oem: '8113002A70',
      partName: 'Headlight Assembly (Left)',
      condition: 'NEW',
      price: 285.00,
      stockQuantity: 1,
      description: 'Brand new OEM headlight assembly for left side. LED type.',
      fuelType: 'PETROL',
      powerKW: 97,
      bodyType: 'SEDAN',
    },
  });

  const part3 = await prisma.part.upsert({
    where: { id: 3 },
    update: {},
    create: {
      make: 'Tesla',
      model: 'Model 3',
      year: 2022,
      oem: '1044286-00-D',
      partName: 'Rear Door Panel',
      condition: 'REFURBISHED',
      price: 680.00,
      stockQuantity: 1,
      colour: 'Pearl White',
      description: 'Refurbished rear door panel. Professionally restored to like-new condition.',
      fuelType: 'ELECTRIC',
      powerKW: 208,
      bodyType: 'SEDAN',
    },
  });

  const part4 = await prisma.part.upsert({
    where: { id: 4 },
    update: {},
    create: {
      make: 'VW',
      model: 'Golf',
      year: 2018,
      oem: '5G0601025BK',
      partName: 'Alloy Wheel 16"',
      condition: 'USED',
      price: 120.00,
      stockQuantity: 4,
      description: 'Original 16" alloy wheels in good condition. Set of 4 available.',
      fuelType: 'PETROL',
      engineCapacityL: 1.4,
      bodyType: 'HATCHBACK',
      gearbox: 'MANUAL',
    },
  });

  const part5 = await prisma.part.upsert({
    where: { id: 5 },
    update: {},
    create: {
      make: 'BMW',
      model: '320d',
      year: 2019,
      oem: '11658519476',
      partName: 'Engine Oil Filter',
      condition: 'NEW',
      price: 25.00,
      stockQuantity: 15,
      description: 'OEM quality oil filter for BMW diesel engines.',
      fuelType: 'DIESEL',
      engineCapacityL: 2.0,
      powerKW: 140,
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

  console.log('Seeded:', {
    admin: admin.email,
    user: user.email,
    cities: [vilnius.name, kaunas.name],
    cars: [car1.vin, car2.vin, car3.vin, car4.vin],
    carsForSale: [car2.make + ' ' + car2.model, car4.make + ' ' + car4.model],
    parts: [part1.partName, part2.partName, part3.partName, part4.partName, part5.partName],
  });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
