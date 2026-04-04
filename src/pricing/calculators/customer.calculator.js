/**
 * Customer Calculator
 * Calculates personalized pricing based on customer history and loyalty
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const RECENT_ACTIVITY_BONUS_PCT = 3;
const MAX_TOTAL_LOYALTY_DISCOUNT_PCT = 15;

/**
 * Shared loyalty math for pricing + /loyalty API (must stay in sync).
 * @param {Array<{ totalPrice: number, state: string, endDate: Date }>} contracts
 */
export function computeLoyaltyFromContracts(contracts) {
  if (!contracts.length) {
    return {
      tier: 'New Customer',
      tierDiscountPct: 0,
      recentActivityBonusPct: 0,
      effectiveDiscountPct: 0,
      multiplier: 1.0,
      completedRentals: 0,
      lifetimeValue: 0,
    };
  }

  const completedRentals = contracts.filter((c) => c.state === 'COMPLETED').length;
  const lifetimeValue = contracts.reduce((sum, c) => sum + c.totalPrice, 0);

  let tier = 'New Customer';
  let tierDiscountPct = 0;

  if (completedRentals >= 11 || lifetimeValue >= 5000) {
    tier = 'VIP';
    tierDiscountPct = 12;
  } else if (completedRentals >= 6) {
    tier = 'Regular';
    tierDiscountPct = 8;
  } else if (completedRentals >= 2) {
    tier = 'Returning';
    tierDiscountPct = 5;
  }

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const recentRental = contracts.some((c) => c.endDate >= sixtyDaysAgo);
  let recentActivityBonusPct = 0;
  if (recentRental && tierDiscountPct > 0) {
    recentActivityBonusPct = RECENT_ACTIVITY_BONUS_PCT;
  }

  const effectiveDiscountPct = Math.min(
    tierDiscountPct + recentActivityBonusPct,
    MAX_TOTAL_LOYALTY_DISCOUNT_PCT
  );
  const multiplier = 1 - effectiveDiscountPct / 100;

  return {
    tier,
    tierDiscountPct,
    recentActivityBonusPct,
    effectiveDiscountPct,
    multiplier,
    completedRentals,
    lifetimeValue,
  };
}

/**
 * Calculate customer-specific multiplier based on history
 * @param {number|null} userId - User ID (optional - null for guest pricing)
 * @returns {Promise<number>} Customer multiplier
 */
export async function calculateCustomerMultiplier(userId = null) {
  if (!userId) {
    return 1.0;
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
        endDate: true,
      },
    });

    return computeLoyaltyFromContracts(contracts).multiplier;
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
      tierDiscount: 0,
      recentActivityBonus: 0,
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
        endDate: true,
      },
    });

    const L = computeLoyaltyFromContracts(contracts);

    return {
      tier: L.tier,
      discount: L.effectiveDiscountPct,
      tierDiscount: L.tierDiscountPct,
      recentActivityBonus: L.recentActivityBonusPct,
      rentalsCount: L.completedRentals,
      lifetimeValue: Math.round(L.lifetimeValue * 100) / 100,
    };
  } catch (error) {
    console.error('Error getting loyalty info:', error);
    return {
      tier: 'Unknown',
      discount: 0,
      tierDiscount: 0,
      recentActivityBonus: 0,
      rentalsCount: 0,
      lifetimeValue: 0,
    };
  }
}
