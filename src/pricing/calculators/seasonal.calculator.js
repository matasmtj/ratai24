/**
 * Seasonal Calculator
 * Calculates pricing adjustments based on time of year, day of week, holidays, etc.
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Calculate seasonal multiplier based on date and duration
 * @param {Date} startDate - Rental start date
 * @param {number} duration - Rental duration in days
 * @param {number} cityId - Optional city ID for city-specific factors
 * @returns {Promise<number>} Seasonal multiplier
 */
export async function calculateSeasonalMultiplier(startDate, duration, cityId = null) {
  let multiplier = 1.0;

  // 1. Check for custom seasonal factors in database
  const customFactors = await getActiveSeasonalFactors(startDate, cityId);
  if (customFactors.length > 0) {
    // Apply the highest multiplier if multiple factors match
    const maxCustomMultiplier = Math.max(...customFactors.map(f => f.multiplier));
    multiplier *= maxCustomMultiplier;
  } else {
    // 2. Apply default seasonal logic
    const month = startDate.getMonth(); // 0-11
    
    // Summer season (June, July, August) - peak travel
    if (month >= 5 && month <= 7) {
      multiplier *= 1.3; // 30% premium
    }
    // Winter low season (January, February, March)
    else if (month >= 0 && month <= 2) {
      multiplier *= 0.85; // 15% discount
    }
    // Spring/Fall shoulder seasons
    else {
      multiplier *= 1.0; // Normal pricing
    }
  }

  // 3. Day of week adjustment for short rentals
  if (duration <= 3) {
    const dayOfWeek = startDate.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Weekend premium (Friday, Saturday)
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      multiplier *= 1.15; // 15% weekend premium
    }
    // Monday discount (typically slow)
    else if (dayOfWeek === 1) {
      multiplier *= 0.95; // 5% Monday discount
    }
  }

  // 4. Holiday detection (simplified - you can enhance with a calendar API)
  const holidays = getHolidays(startDate.getFullYear());
  const isNearHoliday = holidays.some(holiday => {
    const daysDiff = Math.abs((startDate - holiday) / (1000 * 60 * 60 * 24));
    return daysDiff <= 2; // Within 2 days of holiday
  });

  if (isNearHoliday) {
    multiplier *= 1.25; // 25% holiday premium
  }

  // 5. Booking advance adjustment
  const daysUntilStart = Math.floor((startDate - new Date()) / (1000 * 60 * 60 * 24));
  
  if (daysUntilStart < 3) {
    // Last-minute booking (urgency)
    multiplier *= 1.15; // 15% last-minute premium
  } else if (daysUntilStart > 30) {
    // Early bird booking
    multiplier *= 0.95; // 5% early booking discount
  }

  return multiplier;
}

/**
 * Get active seasonal factors from database
 * @param {Date} date - Date to check
 * @param {number} cityId - Optional city ID
 * @returns {Promise<Array>} Active seasonal factors
 */
export async function getActiveSeasonalFactors(date, cityId = null) {
  try {
    const factors = await prisma.seasonalFactor.findMany({
      where: {
        isActive: true,
        startDate: { lte: date },
        endDate: { gte: date },
        OR: [
          { cityId: cityId },
          { cityId: null }, // Global factors
        ],
      },
      orderBy: {
        multiplier: 'desc', // Highest multiplier first
      },
    });

    return factors;
  } catch (error) {
    console.error('Error fetching seasonal factors:', error);
    return [];
  }
}

/**
 * Get major holidays for a year (simplified Lithuanian holidays)
 * @param {number} year - Year
 * @returns {Array<Date>} Array of holiday dates
 */
export function getHolidays(year) {
  return [
    new Date(year, 0, 1),   // New Year's Day
    new Date(year, 1, 16),  // Independence Day (Lithuania)
    new Date(year, 2, 11),  // Restoration of Independence
    new Date(year, 4, 1),   // Labor Day
    new Date(year, 5, 24),  // St. John's Day (Midsummer)
    new Date(year, 6, 6),   // Statehood Day
    new Date(year, 7, 15),  // Assumption Day
    new Date(year, 10, 1),  // All Saints' Day
    new Date(year, 11, 24), // Christmas Eve
    new Date(year, 11, 25), // Christmas Day
    new Date(year, 11, 26), // Second day of Christmas
  ];
}

function parseDateOnlyUtc(value) {
  if (value == null || typeof value !== 'string') throw new Error('Invalid date');
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim());
  if (!m) throw new Error('Invalid date format; use YYYY-MM-DD');
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
}

function parseMultiplier(raw) {
  const s = typeof raw === 'string' ? raw.replace(',', '.').trim() : raw;
  const mult = Number(s);
  if (!Number.isFinite(mult) || mult < 0.1 || mult > 3) {
    throw new Error('multiplier must be between 0.1 and 3');
  }
  return mult;
}

/**
 * Create a seasonal factor rule
 * @param {Object} data - Seasonal factor data
 * @returns {Promise<Object>} Created seasonal factor
 */
export async function createSeasonalFactor(data) {
  const name = String(data?.name ?? '').trim();
  if (!name) throw new Error('Name is required');
  const startDate = parseDateOnlyUtc(data.startDate);
  const endDate = parseDateOnlyUtc(data.endDate);
  if (endDate < startDate) throw new Error('endDate must be on or after startDate');
  const multiplier = parseMultiplier(data.multiplier);
  let cityId = null;
  if (data.cityId != null && data.cityId !== '') {
    const c = parseInt(String(data.cityId), 10);
    if (Number.isNaN(c)) throw new Error('Invalid cityId');
    cityId = c;
  }
  return prisma.seasonalFactor.create({
    data: {
      name,
      startDate,
      endDate,
      multiplier,
      cityId,
      isActive: data.isActive !== false,
    },
  });
}

/**
 * @param {number} id
 * @param {Object} body
 * @returns {Promise<Object|null>}
 */
export async function updateSeasonalFactorRecord(id, body) {
  const existing = await prisma.seasonalFactor.findUnique({ where: { id } });
  if (!existing) return null;

  const startDate =
    body.startDate !== undefined ? parseDateOnlyUtc(body.startDate) : existing.startDate;
  const endDate =
    body.endDate !== undefined ? parseDateOnlyUtc(body.endDate) : existing.endDate;
  if (endDate < startDate) throw new Error('endDate must be on or after startDate');

  const name =
    body.name !== undefined ? String(body.name).trim() : existing.name;
  if (!name) throw new Error('Name cannot be empty');

  let multiplier = existing.multiplier;
  if (body.multiplier !== undefined) {
    multiplier = parseMultiplier(body.multiplier);
  }

  let cityId = existing.cityId;
  if (body.cityId !== undefined) {
    if (body.cityId === null || body.cityId === '') cityId = null;
    else {
      const c = parseInt(String(body.cityId), 10);
      if (Number.isNaN(c)) throw new Error('Invalid cityId');
      cityId = c;
    }
  }

  const isActive =
    body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive;

  return prisma.seasonalFactor.update({
    where: { id },
    data: { name, startDate, endDate, multiplier, cityId, isActive },
  });
}

/**
 * @param {number} id
 */
export async function deleteSeasonalFactorRecord(id) {
  await prisma.seasonalFactor.delete({ where: { id } });
}
