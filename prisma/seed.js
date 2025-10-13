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
    create: { email: 'admin@example.com', passwordHash: adminPass, role: 'ADMIN' }
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: { email: 'user@example.com', passwordHash: userPass, role: 'USER' }
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

  // Cars
  const car1 = await prisma.car.upsert({
  where: {
    make_model_year_cityId: { make: 'Toyota', model: 'Corolla', year: 2020, cityId: vilnius.id }
  },
  update: {
    pricePerDay: 35.0,
    seatCount: 5, fuelType: 'PETROL', powerKW: 97, engineCapacityL: 1.6,
    bodyType: 'SEDAN', gearbox: 'MANUAL', state: 'AVAILABLE', odometerKm: 60000
  },
  create: {
    make: 'Toyota', model: 'Corolla', year: 2020, pricePerDay: 35.0, cityId: vilnius.id,
    seatCount: 5, fuelType: 'PETROL', powerKW: 97, engineCapacityL: 1.6,
    bodyType: 'SEDAN', gearbox: 'MANUAL', state: 'AVAILABLE', odometerKm: 60000
  }
});

const car2 = await prisma.car.upsert({
  where: {
    make_model_year_cityId: { make: 'Tesla', model: 'Model 3', year: 2022, cityId: vilnius.id }
  },
  update: {
    pricePerDay: 95.0,
    seatCount: 5, fuelType: 'ELECTRIC', powerKW: 208, engineCapacityL: null,
    bodyType: 'SEDAN', gearbox: 'AUTOMATIC', state: 'AVAILABLE', odometerKm: 15000
  },
  create: {
    make: 'Tesla', model: 'Model 3', year: 2022, pricePerDay: 95.0, cityId: vilnius.id,
    seatCount: 5, fuelType: 'ELECTRIC', powerKW: 208, engineCapacityL: null,
    bodyType: 'SEDAN', gearbox: 'AUTOMATIC', state: 'AVAILABLE', odometerKm: 15000
  }
});

const car3 = await prisma.car.upsert({
  where: {
    make_model_year_cityId: { make: 'VW', model: 'Golf', year: 2018, cityId: kaunas.id }
  },
  update: {
    pricePerDay: 30.0,
    seatCount: 5, fuelType: 'PETROL', powerKW: 81, engineCapacityL: 1.4,
    bodyType: 'HATCHBACK', gearbox: 'MANUAL', state: 'AVAILABLE', odometerKm: 80000
  },
  create: {
    make: 'VW', model: 'Golf', year: 2018, pricePerDay: 30.0, cityId: kaunas.id,
    seatCount: 5, fuelType: 'PETROL', powerKW: 81, engineCapacityL: 1.4,
    bodyType: 'HATCHBACK', gearbox: 'MANUAL', state: 'AVAILABLE', odometerKm: 80000
  }
});

  // Contracts (user leases car1)
  await prisma.contract.create({
  data: {
    userId: user.id,
    carId: car1.id,
    startDate: new Date('2025-09-01'),
    endDate: new Date('2025-09-05'),
    totalPrice: 35.0 * 4,
    state: 'ACTIVE',
    mileageStartKm: 60000,
    fuelLevelStartPct: 80
  }
});


  console.log('Seeded:', { admin: admin.email, user: user.email, cities: [vilnius.name, kaunas.name] });
}

main().finally(() => prisma.$disconnect());
