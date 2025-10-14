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
    cars: [car1.vin, car2.vin, car3.vin],
  });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
