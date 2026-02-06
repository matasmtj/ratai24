/**
 * Customer Calculator
 * Calculates personalized pricing based on customer history and loyalty
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Calculate customer-specific multiplier based on history
 * @param {number} userId - User ID (optional - null for guest pricing)
 * @returns {Promise<number>} Customer multiplier
 */
export async function calculateCustomerMultiplier(userId = null) {
  if (!userId) {
    return 1.0; // Guest/first-time customer - normal pricing
  }

  try {
    // Get customer's rental history
    const contracts = await prisma.contract.findMany({
      where: {
        userId,
        state: { in: ['COMPLETED', 'ACTIVE'] },
      },
      select: {
        totalPrice: true,
        state: true,
        startDate: true,
        endDate: true,
      },
    });

    if (contracts.length === 0) {
      return 1.0; // First booking - normal pricing
    }

    // Calculate loyalty tier
    const completedRentals = contracts.filter(c => c.state === 'COMPLETED').length;
    const lifetimeValue = contracts.reduce((sum, c) => sum + c.totalPrice, 0);

    let loyaltyDiscount = 0;

    // Tier 1: Returning customer (2-5 rentals)
    if (completedRentals >= 2 && completedRentals <= 5) {
      loyaltyDiscount = 0.05; // 5% discount
    }
    // Tier 2: Regular customer (6-10 rentals)
    else if (completedRentals >= 6 && completedRentals <= 10) {
      loyaltyDiscount = 0.08; // 8% discount
    }
    // Tier 3: VIP customer (11+ rentals OR €5000+ lifetime value)
    else if (completedRentals > 10 || lifetimeValue >= 5000) {
      loyaltyDiscount = 0.12; // 12% discount
    }

    // Check recent activity (rented in last 60 days gets extra bonus)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentRental = contracts.some(c => c.endDate >= sixtyDaysAgo);
    if (recentRental && loyaltyDiscount > 0) {
      loyaltyDiscount += 0.03; // Extra 3% for recent activity
    }

    // Return multiplier (discount reduces the price)
    const multiplier = 1.0 - Math.min(loyaltyDiscount, 0.15); // Cap at 15% total discount
    return multiplier;
  } catch (error) {
    console.error('Error calculating customer multiplier:', error);
    return 1.0;
  }
}

/**
 * Get customer loyalty tier info
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Loyalty info
 */
export async function getCustomerLoyaltyInfo(userId) {
  if (!userId) {
    return {
      tier: 'Guest',
      discount: 0,
      rentalsCount: 0,
      lifetimeValue: 0,
    };
  }

  try {
    const contracts = await prisma.contract.findMany({
      where: {
        userId,
        state: { in: ['COMPLETED', 'ACTIVE'] },
      },
      select: {
        totalPrice: true,
        state: true,
      },
    });

    const completedRentals = contracts.filter(c => c.state === 'COMPLETED').length;
    const lifetimeValue = contracts.reduce((sum, c) => sum + c.totalPrice, 0);

    let tier = 'New Customer';
    let discount = 0;

    if (completedRentals >= 11 || lifetimeValue >= 5000) {
      tier = 'VIP';
      discount = 12;
    } else if (completedRentals >= 6) {
      tier = 'Regular';
      discount = 8;
    } else if (completedRentals >= 2) {
      tier = 'Returning';
      discount = 5;
    }

    return {
      tier,
      discount,
      rentalsCount: completedRentals,
      lifetimeValue: Math.round(lifetimeValue * 100) / 100,
    };
  } catch (error) {
    console.error('Error getting loyalty info:', error);
    return {
      tier: 'Unknown',
      discount: 0,
      rentalsCount: 0,
      lifetimeValue: 0,
    };
  }
}
