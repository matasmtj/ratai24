/**
 * Pricing System Utilities
 * Helper functions for testing and initializing the pricing system
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import { calculatePriceConstraints } from './calculators/base-price.calculator.js';
import { calculateDynamicPrice } from './pricing.service.js';
import { runAllPricingJobs } from './pricing.jobs.js';

/**
 * Initialize pricing configuration for all cars
 * Sets recommended base, min, and max prices
 */
export async function initializeCarPricing() {
  console.log('Initializing pricing configuration for all cars...');
  
  const cars = await prisma.car.findMany({
    where: { availableForLease: true },
  });

  let updated = 0;

  for (const car of cars) {
    try {
      // Calculate recommended pricing if not already set
      if (!car.basePricePerDay) {
        const constraints = calculatePriceConstraints({
          ...car,
          // Set some default values if missing
          dailyOperatingCost: car.dailyOperatingCost || 5, // €5/day default
          pricePerDay: car.pricePerDay || 50, // Fallback
        });

        await prisma.car.update({
          where: { id: car.id },
          data: {
            basePricePerDay: constraints.basePricePerDay,
            minPricePerDay: constraints.minPricePerDay,
            maxPricePerDay: constraints.maxPricePerDay,
            useDynamicPricing: true,
          },
        });

        updated++;
        console.log(`✓ Updated ${car.make} ${car.model} (ID: ${car.id})`);
      }
    } catch (error) {
      console.error(`✗ Error updating car ${car.id}:`, error.message);
    }
  }

  console.log(`\nInitialization complete. Updated ${updated} cars.`);
}

/**
 * Create default seasonal factors
 */
export async function createDefaultSeasonalFactors() {
  console.log('Creating default seasonal factors...');

  const factors = [
    {
      name: 'Summer Peak Season',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-08-31'),
      multiplier: 1.3,
      isActive: true,
    },
    {
      name: 'Christmas Holiday',
      startDate: new Date('2026-12-20'),
      endDate: new Date('2027-01-05'),
      multiplier: 1.25,
      isActive: true,
    },
    {
      name: 'Easter Holiday',
      startDate: new Date('2026-04-10'),
      endDate: new Date('2026-04-20'),
      multiplier: 1.2,
      isActive: true,
    },
  ];

  for (const factor of factors) {
    try {
      // Check if already exists
      const existing = await prisma.seasonalFactor.findFirst({
        where: { name: factor.name },
      });

      if (!existing) {
        await prisma.seasonalFactor.create({ data: factor });
        console.log(`✓ Created: ${factor.name}`);
      } else {
        console.log(`- Skipped: ${factor.name} (already exists)`);
      }
    } catch (error) {
      console.error(`✗ Error creating ${factor.name}:`, error.message);
    }
  }

  console.log('\nSeasonal factors setup complete.');
}

/**
 * Test pricing calculation for a sample car
 */
export async function testPricingCalculation() {
  console.log('Testing pricing calculation...\n');

  // Get a random car
  const car = await prisma.car.findFirst({
    where: { availableForLease: true },
  });

  if (!car) {
    console.log('No cars available for testing.');
    return;
  }

  console.log(`Testing with: ${car.make} ${car.model} (ID: ${car.id})`);
  console.log('─'.repeat(60));

  // Test different scenarios
  const scenarios = [
    {
      name: 'Weekend Short Rental',
      startDate: new Date('2026-03-07'), // Friday
      endDate: new Date('2026-03-09'),   // Sunday
    },
    {
      name: 'One Week Rental',
      startDate: new Date('2026-03-10'),
      endDate: new Date('2026-03-17'),
    },
    {
      name: 'Summer Month Rental',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-31'),
    },
  ];

  for (const scenario of scenarios) {
    try {
      const result = await calculateDynamicPrice({
        carId: car.id,
        startDate: scenario.startDate,
        endDate: scenario.endDate,
        userId: null,
        saveSnapshot: false,
      });

      console.log(`\n${scenario.name}:`);
      console.log(`  Period: ${scenario.startDate.toLocaleDateString()} - ${scenario.endDate.toLocaleDateString()}`);
      console.log(`  Base Price: €${result.basePrice}/day`);
      console.log(`  Final Price: €${result.pricePerDay}/day`);
      console.log(`  Total: €${result.totalPrice}`);
      console.log(`  Multipliers:`);
      console.log(`    - Demand: ${result.breakdown.multipliers.demand.toFixed(2)}x`);
      console.log(`    - Seasonal: ${result.breakdown.multipliers.seasonal.toFixed(2)}x`);
      console.log(`    - Duration: ${result.breakdown.multipliers.duration.toFixed(2)}x`);
      console.log(`    - Utilization: ${result.breakdown.multipliers.utilization.toFixed(2)}x`);
    } catch (error) {
      console.error(`  Error: ${error.message}`);
    }
  }

  console.log('\n' + '─'.repeat(60));
}

/**
 * Generate pricing report for all cars
 */
export async function generatePricingReport() {
  console.log('Generating pricing report...\n');

  const cars = await prisma.car.findMany({
    where: { availableForLease: true },
    include: { city: true },
  });

  console.log('Car Pricing Configuration Report');
  console.log('═'.repeat(80));
  console.log();

  for (const car of cars) {
    console.log(`${car.make} ${car.model} (${car.year}) - ${car.city.name}`);
    console.log(`  Dynamic Pricing: ${car.useDynamicPricing ? '✓ Enabled' : '✗ Disabled'}`);
    console.log(`  Base Price: €${car.basePricePerDay || car.pricePerDay}/day`);
    console.log(`  Range: €${car.minPricePerDay || 'N/A'} - €${car.maxPricePerDay || 'N/A'}`);
    console.log(`  Utilization: ${car.utilizationRate ? (car.utilizationRate * 100).toFixed(1) + '%' : 'N/A'}`);
    console.log();
  }
}

/**
 * Full system initialization
 */
export async function fullInitialization() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     Dynamic Pricing System - Full Initialization      ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log();

  // Step 1: Initialize car pricing
  await initializeCarPricing();
  console.log();

  // Step 2: Create seasonal factors
  await createDefaultSeasonalFactors();
  console.log();

  // Step 3: Run background jobs
  console.log('Running initial background jobs...');
  await runAllPricingJobs();
  console.log();

  // Step 4: Test calculation
  await testPricingCalculation();
  console.log();

  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║            Initialization Complete! ✓                 ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log();
  console.log('Next steps:');
  console.log('  1. Review pricing configuration in admin panel');
  console.log('  2. Test price calculations via API');
  console.log('  3. Monitor background jobs in logs');
  console.log('  4. Adjust multipliers and rules as needed');
  console.log();

  await prisma.$disconnect();
}

// Allow running from command line
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || 
    process.argv[1].includes('pricing.utils.js')) {
  const command = process.argv[2];

  switch (command) {
    case 'init':
      fullInitialization().catch(console.error);
      break;
    case 'init-cars':
      initializeCarPricing().then(() => prisma.$disconnect()).catch(console.error);
      break;
    case 'init-seasonal':
      createDefaultSeasonalFactors().then(() => prisma.$disconnect()).catch(console.error);
      break;
    case 'test':
      testPricingCalculation().then(() => prisma.$disconnect()).catch(console.error);
      break;
    case 'report':
      generatePricingReport().then(() => prisma.$disconnect()).catch(console.error);
      break;
    default:
      console.log('Usage:');
      console.log('  node src/pricing/pricing.utils.js init          - Full initialization');
      console.log('  node src/pricing/pricing.utils.js init-cars     - Initialize car pricing only');
      console.log('  node src/pricing/pricing.utils.js init-seasonal - Create seasonal factors');
      console.log('  node src/pricing/pricing.utils.js test          - Test calculations');
      console.log('  node src/pricing/pricing.utils.js report        - Generate report');
  }
}
