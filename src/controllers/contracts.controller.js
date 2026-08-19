import prisma from '../models/db.js';
import { badRequest, notFound, conflict } from '../errors.js';
import { rentalEndNeedsPrepDay, nextPrepDayRangeUtc } from '../lib/rentalPrep.js';
import { calculateDynamicPrice } from '../pricing/pricing.service.js';
import { calculateRequiredDeposit } from '../pricing/calculators/deposit.calculator.js';
import {
  acquireContractEditLock,
  releaseContractEditLock,
  clearContractEditLock,
  assertAdminContractEditLock,
  attachLockMeta,
  contractWithLockInclude,
} from '../lib/contractEditLock.js';

/**
 * Derive and attach the `requiredDeposit` field (in euro) onto a contract
 * response. Duration-based per the deposit calculator policy.
 */
function attachDeposit(contract) {
  if (!contract) return contract;
  return {
    ...contract,
    requiredDeposit: calculateRequiredDeposit(contract.startDate, contract.endDate),
  };
}

/** Compose `attachLockMeta` + `attachDeposit` for the common case. */
function decorateContract(contract) {
  return attachDeposit(attachLockMeta(contract));
}

const asInt = (v) => { const n = Number(v); return Number.isInteger(n) ? n : null; };
const asNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

const ContractState = ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
const OPEN_RESERVATION_LIMIT = 3;

const isOwnerOrAdmin = (req, userId) => {
  if (!req.user) return true;            // auth off → allow
  if (req.user.role === 'ADMIN') return true;
  if (userId == null) return false;
  return req.user.id === userId;
};

async function assertNoCalendarConflict(carId, start, end, excludeContractId = null) {
  const overContract = await prisma.contract.findFirst({
    where: {
      carId,
      ...(excludeContractId != null ? { id: { not: excludeContractId } } : {}),
      state: { in: ['DRAFT', 'ACTIVE'] },
      AND: [{ startDate: { lt: end } }, { endDate: { gt: start } }],
    },
  });
  if (overContract) {
    throw badRequest('Selected dates overlap an existing reservation');
  }
  const overPrep = await prisma.carPrepBlock.findFirst({
    where: {
      carId,
      AND: [{ startDate: { lt: end } }, { endDate: { gt: start } }],
    },
  });
  if (overPrep) {
    throw badRequest('Selected dates are not available for this car');
  }
}

// GET /contracts
export const listContracts = async (req, res, next) => {
  try {
    // Admin can filter by state, userId, carId
    const where = {};
    
    if (req.query.state) {
      if (!ContractState.includes(req.query.state)) {
        throw badRequest(`state must be one of: ${ContractState.join(', ')}`);
      }
      where.state = req.query.state;
    }
    
    if (req.query.userId) {
      const uid = asInt(req.query.userId);
      if (uid === null) throw badRequest('userId must be an integer');
      where.userId = uid;
    }
    
    if (req.query.carId) {
      const cid = asInt(req.query.carId);
      if (cid === null) throw badRequest('carId must be an integer');
      where.carId = cid;
    }
    
    const items = await prisma.contract.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: contractWithLockInclude,
    });
    res.json(items.map(decorateContract));
  } catch (e) { next(e); }
};

// GET /contracts/my - User gets their own contracts
export const getMyContracts = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const where = { userId: req.user.id };
    
    // Allow filtering by state
    if (req.query.state) {
      if (!ContractState.includes(req.query.state)) {
        throw badRequest(`state must be one of: ${ContractState.join(', ')}`);
      }
      where.state = req.query.state;
    }
    
    const items = await prisma.contract.findMany({ 
      where,
      orderBy: { startDate: 'desc' },
      include: {
        car: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            numberPlate: true,
            images: {
              where: { isMain: true },
              select: { url: true }
            }
          }
        }
      }
    });
    res.json(items.map(attachDeposit));
  } catch (e) { next(e); }
};

// GET /contracts/:id
export const getContract = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');

    const item = await prisma.contract.findUnique({
      where: { id },
      include: contractWithLockInclude,
    });
    if (!item) throw notFound('Contract not found');

    if (!isOwnerOrAdmin(req, item.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(decorateContract(item));
  } catch (e) { next(e); }
};

// POST /contracts
export const createContract = async (req, res, next) => {
  try {
    const body = req.body ?? {};
    if (typeof body !== 'object' || Array.isArray(body)) throw badRequest('body must be an object');

    const { carId, startDate, endDate, mileageStartKm, fuelLevelStartPct, notes } = body;

    const carIdNum = asInt(carId); if (carIdNum === null) throw badRequest('carId must be an integer');

    if (mileageStartKm == null || fuelLevelStartPct == null) {
      throw badRequest('mileageStartKm and fuelLevelStartPct are required');
    }
    const msKm = asInt(mileageStartKm); if (msKm === null || msKm < 0) throw badRequest('mileageStartKm must be a non-negative integer');
    const flPct = asInt(fuelLevelStartPct); if (flPct === null || flPct < 0 || flPct > 100) throw badRequest('fuelLevelStartPct must be 0..100');

    // FK: car exists
    const car = await prisma.car.findUnique({ where: { id: carIdNum } });
    if (!car) throw badRequest('Invalid carId');
    if (car.state === 'MAINTENANCE') throw badRequest('This car is not available for booking');

    // dates
    const sd = new Date(startDate), ed = new Date(endDate);
    if (isNaN(sd) || isNaN(ed) || ed <= sd) throw badRequest('Invalid dates');
    
    // Date range sanity checks
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const tenYearsFromNow = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate());
    
    if (sd < oneYearAgo) throw badRequest('startDate cannot be more than 1 year in the past');
    if (ed > tenYearsFromNow) throw badRequest('endDate cannot be more than 10 years in the future');

    // notes (optional; empty string allowed)
    if (notes !== undefined && notes !== null && typeof notes !== 'string') {
      throw badRequest('notes must be a string');
    }

    const userId = req.user?.id ?? 1;
    const openReservationsCount = await prisma.contract.count({
      where: {
        userId,
        state: { in: ['DRAFT', 'ACTIVE'] },
      },
    });
    if (openReservationsCount >= OPEN_RESERVATION_LIMIT) {
      throw badRequest(`You can have up to ${OPEN_RESERVATION_LIMIT} active or pending reservations at a time`);
    }

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const days = Math.max(1, Math.ceil(( ed - sd ) / MS_PER_DAY));

    await assertNoCalendarConflict(car.id, sd, ed);

    const pricing = await calculateDynamicPrice({
      carId: car.id,
      startDate: sd,
      endDate: ed,
      userId,
      saveSnapshot: car.useDynamicPricing,
    });

    const totalPrice = pricing.totalPrice;

    let pricingPayload = {};

    const basePerDay = pricing.basePrice ?? car.pricePerDay;
    const calculatedPerDay = pricing.breakdown?.dynamicPrice ?? pricing.pricePerDay;
    const finalPerDay = pricing.pricePerDay;

    if (car.useDynamicPricing) {
      pricingPayload = {
        basePrice: basePerDay,
        dynamicPrice: calculatedPerDay,
        finalPrice: finalPerDay,
        appliedDiscount: basePerDay > 0 ? Math.round(((basePerDay - finalPerDay) / basePerDay) * 10000) / 100 : 0,
        demandMultiplier: pricing.breakdown?.multipliers?.demand ?? null,
        seasonalMultiplier: pricing.breakdown?.multipliers?.seasonal ?? null,
        durationDiscount: pricing.breakdown?.multipliers?.duration ?? null,
      };
    } else {
      pricingPayload = {
        basePrice: basePerDay,
        dynamicPrice: calculatedPerDay,
        finalPrice: finalPerDay,
        appliedDiscount: basePerDay > 0 ? Math.round(((basePerDay - finalPerDay) / basePerDay) * 10000) / 100 : 0,
        demandMultiplier: null,
        seasonalMultiplier: null,
        durationDiscount: null,
      };
    }

    if (totalPrice < 0) throw badRequest('Calculated totalPrice is negative (invalid dates or pricePerDay)');

    const created = await prisma.contract.create({
      data: {
        userId,
        carId: car.id,
        startDate: sd,
        endDate: ed,
        totalPrice,
        state: 'DRAFT',
        mileageStartKm: msKm,
        fuelLevelStartPct: flPct,
        ...(notes !== undefined && String(notes).trim() !== ''
          ? { notes: String(notes).trim() }
          : {}),
        ...pricingPayload,
      }
    });

    res.status(201).json(attachDeposit(created));
  } catch (e) {
    if (e?.code === 'P2003') return res.status(400).json({ error: 'Foreign key constraint (carId) failed' });
    next(e);
  }
};

// POST /contracts/manual — admin walk-in reservation without user account
export const createManualContract = async (req, res, next) => {
  try {
    const body = req.body ?? {};
    if (typeof body !== 'object' || Array.isArray(body)) throw badRequest('body must be an object');

    const { carId, startDate, endDate, guestName, guestPhone, guestEmail, notes } = body;

    const carIdNum = asInt(carId);
    if (carIdNum === null) throw badRequest('carId must be an integer');

    if (!isNonEmptyString(guestName)) throw badRequest('guestName is required');
    if (!isNonEmptyString(guestPhone)) throw badRequest('guestPhone is required');
    if (guestEmail !== undefined && guestEmail !== null && guestEmail !== '' && typeof guestEmail !== 'string') {
      throw badRequest('guestEmail must be a string');
    }
    if (notes !== undefined && notes !== null && typeof notes !== 'string') {
      throw badRequest('notes must be a string');
    }

    const car = await prisma.car.findUnique({ where: { id: carIdNum } });
    if (!car) throw badRequest('Invalid carId');
    if (!car.availableForLease) throw badRequest('Car is not available for lease');
    if (car.state === 'MAINTENANCE') throw badRequest('This car is not available for booking');

    const sd = new Date(startDate);
    const ed = new Date(endDate);
    if (isNaN(sd) || isNaN(ed) || ed <= sd) throw badRequest('Invalid dates');

    await assertNoCalendarConflict(car.id, sd, ed);

    const pricing = await calculateDynamicPrice({
      carId: car.id,
      startDate: sd,
      endDate: ed,
      userId: null,
      saveSnapshot: false,
    });

    const created = await prisma.contract.create({
      data: {
        userId: null,
        carId: car.id,
        startDate: sd,
        endDate: ed,
        totalPrice: pricing.totalPrice,
        state: 'ACTIVE',
        mileageStartKm: car.odometerKm,
        fuelLevelStartPct: 100,
        depositConfirmed: true,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        ...(guestEmail && String(guestEmail).trim()
          ? { guestEmail: String(guestEmail).trim() }
          : {}),
        ...(notes !== undefined && String(notes).trim() !== ''
          ? { notes: String(notes).trim() }
          : {}),
      },
    });

    res.status(201).json(attachDeposit(created));
  } catch (e) {
    if (e?.code === 'P2003') return res.status(400).json({ error: 'Foreign key constraint (carId) failed' });
    next(e);
  }
};

// PUT /contracts/:id
export const updateContract = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');

    const current = await prisma.contract.findUnique({
      where: { id },
      include: contractWithLockInclude,
    });
    if (!current) throw notFound('Contract not found');

    if (!isOwnerOrAdmin(req, current.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (req.user?.role === 'ADMIN') {
      assertAdminContractEditLock(req, current);
    }

    const data = { ...(req.body ?? {}) };
    if (typeof data !== 'object' || Array.isArray(data)) throw badRequest('body must be an object');

    const { startDate, endDate, carId, state, mileageEndKm, fuelLevelEndPct, notes } = data;

    // dates (allow partial)
    const newStart = startDate ? new Date(startDate) : current.startDate;
    const newEnd   = endDate   ? new Date(endDate)   : current.endDate;
    if (isNaN(newStart) || isNaN(newEnd) || newEnd <= newStart) {
      throw badRequest('Invalid dates');
    }
    
    // Date range sanity checks
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const tenYearsFromNow = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate());
    
    if (newStart < oneYearAgo) throw badRequest('startDate cannot be more than 1 year in the past');
    if (newEnd > tenYearsFromNow) throw badRequest('endDate cannot be more than 10 years in the future');

    // car (optional) + FK
    const newCarId = carId !== undefined ? asInt(carId) : current.carId;
    if (newCarId === null) throw badRequest('carId must be an integer');
    const car = await prisma.car.findUnique({ where: { id: newCarId } });
    if (!car) throw badRequest('Invalid carId');

    // state enum (optional)
    if (state !== undefined && !ContractState.includes(state)) {
      throw badRequest(`state must be one of: ${ContractState.join(', ')}`);
    }

    const pricing = await calculateDynamicPrice({
      carId: newCarId,
      startDate: newStart,
      endDate: newEnd,
      userId: current.userId,
      saveSnapshot: car.useDynamicPricing,
    });

    const totalPrice = pricing.totalPrice;
    if (totalPrice < 0) throw badRequest('Calculated totalPrice is negative (invalid dates or pricePerDay)');

    const basePerDay = pricing.basePrice ?? car.pricePerDay;
    const calculatedPerDay = pricing.breakdown?.dynamicPrice ?? pricing.pricePerDay;
    const finalPerDay = pricing.pricePerDay;

    const appliedDiscount =
      basePerDay > 0 ? Math.round(((basePerDay - finalPerDay) / basePerDay) * 10000) / 100 : 0;

    const upd = {
      carId: newCarId,
      startDate: newStart,
      endDate: newEnd,
      totalPrice,
      basePrice: basePerDay,
      dynamicPrice: calculatedPerDay,
      finalPrice: finalPerDay,
      appliedDiscount,
      ...(car.useDynamicPricing
        ? {
            demandMultiplier: pricing.breakdown?.multipliers?.demand ?? null,
            seasonalMultiplier: pricing.breakdown?.multipliers?.seasonal ?? null,
            durationDiscount: pricing.breakdown?.multipliers?.duration ?? null,
          }
        : {
            demandMultiplier: null,
            seasonalMultiplier: null,
            durationDiscount: null,
          }),
    };

    if (mileageEndKm != null) {
      const endKm = asInt(mileageEndKm);
      if (endKm === null || endKm < 0) throw badRequest('mileageEndKm must be a non-negative integer');
      if (endKm < current.mileageStartKm) throw badRequest('mileageEndKm cannot be less than mileageStartKm');
      upd.mileageEndKm = endKm;
    }
    if (fuelLevelEndPct != null) {
      const fl = asInt(fuelLevelEndPct);
      if (fl === null || fl < 0 || fl > 100) throw badRequest('fuelLevelEndPct must be 0..100');
      upd.fuelLevelEndPct = fl;
    }
    if (state !== undefined) upd.state = state;
    if (notes !== undefined) {
      if (typeof notes !== 'string') throw badRequest('notes must be a string');
      upd.notes = notes.trim() === '' ? null : notes.trim();
    }

    const finalState = state !== undefined ? state : current.state;
    if (finalState === 'DRAFT' || finalState === 'ACTIVE') {
      if (car.state === 'MAINTENANCE') {
        throw badRequest('This car is not available for booking');
      }
      await assertNoCalendarConflict(newCarId, newStart, newEnd, id);
    }

    const updated = await prisma.contract.update({ where: { id }, data: upd });
    res.json(attachDeposit(updated));
  } catch (e) {
    if (e?.code === 'P2003') return res.status(400).json({ error: 'Foreign key constraint (carId) failed' });
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Contract not found' });
    next(e);
  }
};

// DELETE /contracts/:id
export const deleteContract = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');

    const item = await prisma.contract.findUnique({
      where: { id },
      include: contractWithLockInclude,
    });
    if (!item) throw notFound('Contract not found');

    if (!isOwnerOrAdmin(req, item.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (req.user?.role === 'ADMIN') {
      assertAdminContractEditLock(req, item);
    }

    await prisma.contract.delete({ where: { id } });
    if (req.user?.role === 'ADMIN') {
      await clearContractEditLock(id);
    }
    res.status(200).json(attachDeposit(item));
  } catch (e) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Contract not found' });
    next(e);
  }
};

// POST /contracts/:id/complete
export const completeContract = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');

    const current = await prisma.contract.findUnique({
      where: { id },
      include: contractWithLockInclude,
    });
    if (!current) throw notFound('Contract not found');

    if (!isOwnerOrAdmin(req, current.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (req.user?.role === 'ADMIN') {
      assertAdminContractEditLock(req, current);
    }

    if (current.state && current.state !== 'ACTIVE') {
      return res.status(409).json({ error: `Cannot complete contract in state ${current.state}` });
    }

    const body = req.body ?? {};
    if (typeof body !== 'object' || Array.isArray(body)) throw badRequest('body must be an object');

    const { mileageEndKm, fuelLevelEndPct, damageFee = 0, notes } = body;

    const endKm = asInt(mileageEndKm);
    if (endKm === null || endKm < 0) throw badRequest('mileageEndKm must be a non-negative integer');
    if (endKm < current.mileageStartKm) throw badRequest('mileageEndKm cannot be less than mileageStartKm');

    const endFuel = asInt(fuelLevelEndPct);
    if (endFuel === null || endFuel < 0 || endFuel > 100) throw badRequest('fuelLevelEndPct must be 0..100');

    const dmg = asNum(damageFee);
    if (dmg === null || dmg < 0) throw badRequest('damageFee must be a non-negative number');

    if (notes !== undefined && notes !== null && typeof notes !== 'string') {
      throw badRequest('notes must be a string');
    }

    // fees
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const days = Math.max(1, Math.ceil(( current.endDate - current.startDate ) / MS_PER_DAY));
    const allowanceKm = 200 * days;

    const drivenKm = endKm - current.mileageStartKm;
    const extraKm = Math.max(0, drivenKm - allowanceKm);
    const extraKmFee = extraKm * 0.10;

    const fuelDeltaPct = Math.max(0, (current.fuelLevelStartPct ?? 0) - endFuel);
    const fuelFee = fuelDeltaPct * 1.0;

    const extraFees = parseFloat((extraKmFee + fuelFee + dmg).toFixed(2));

    await prisma.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id },
        data: {
          mileageEndKm: endKm,
          fuelLevelEndPct: endFuel,
          extraFees,
          state: 'COMPLETED',
          ...(notes !== undefined
            ? { notes: notes.trim() === '' ? null : notes.trim() }
            : {}),
        },
      });

      await tx.car.update({
        where: { id: current.carId },
        data: { odometerKm: endKm, state: 'AVAILABLE' },
      });

      if (rentalEndNeedsPrepDay(current.endDate)) {
        const { startUtc, endExclusiveUtc } = nextPrepDayRangeUtc(current.endDate);
        await tx.carPrepBlock.create({
          data: {
            carId: current.carId,
            startDate: startUtc,
            endDate: endExclusiveUtc,
          },
        });
      }
    });

    if (req.user?.role === 'ADMIN') {
      await clearContractEditLock(id);
    }

    const updated = await prisma.contract.findUnique({
      where: { id },
      include: contractWithLockInclude,
    });
    res.json(decorateContract(updated));
  } catch (e) { next(e); }
};

// POST /contracts/:id/activate - Admin activates DRAFT → ACTIVE
export const activateContract = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');

    const current = await prisma.contract.findUnique({
      where: { id },
      include: contractWithLockInclude,
    });
    if (!current) throw notFound('Contract not found');

    assertAdminContractEditLock(req, current);

    if (current.state !== 'DRAFT') {
      return res.status(409).json({ error: `Cannot activate contract in state ${current.state}. Only DRAFT contracts can be activated.` });
    }

    if (!current.depositConfirmed) {
      const requiredDeposit = calculateRequiredDeposit(current.startDate, current.endDate);
      throw conflict(`Cannot activate reservation until the €${requiredDeposit} deposit is confirmed`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.contract.update({
        where: { id },
        data: { state: 'ACTIVE' },
      });
      await tx.car.update({
        where: { id: current.carId },
        data: { state: 'LEASED' },
      });
      return c;
    });

    await clearContractEditLock(id);
    res.json(decorateContract(updated));
  } catch (e) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Contract not found' });
    next(e);
  }
};

// POST /contracts/:id/cancel - User/Admin cancels contract
export const cancelContract = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');

    const current = await prisma.contract.findUnique({
      where: { id },
      include: contractWithLockInclude,
    });
    if (!current) throw notFound('Contract not found');

    // Check ownership for non-admin users
    if (!isOwnerOrAdmin(req, current.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (req.user?.role === 'ADMIN') {
      assertAdminContractEditLock(req, current);
    }

    // Can only cancel DRAFT or ACTIVE contracts
    if (current.state === 'COMPLETED' || current.state === 'CANCELLED') {
      return res.status(409).json({ error: `Cannot cancel contract in state ${current.state}` });
    }

    const updated = await prisma.contract.update({
      where: { id },
      data: { state: 'CANCELLED' }
    });

    // If car was marked as LEASED, set it back to AVAILABLE
    if (current.state === 'ACTIVE') {
      await prisma.car.update({
        where: { id: current.carId },
        data: { state: 'AVAILABLE' }
      });
    }

    if (req.user?.role === 'ADMIN') {
      await clearContractEditLock(id);
    }

    res.json(attachDeposit(updated));
  } catch (e) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Contract not found' });
    next(e);
  }
};

// POST /contracts/:id/confirm-deposit — admin marks deposit as received
export const confirmContractDeposit = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');

    const current = await prisma.contract.findUnique({
      where: { id },
      include: contractWithLockInclude,
    });
    if (!current) throw notFound('Contract not found');

    assertAdminContractEditLock(req, current);

    if (current.state !== 'DRAFT') {
      throw conflict('Deposit can only be confirmed for pending reservations');
    }

    if (current.depositConfirmed) {
      return res.json(decorateContract(current));
    }

    const updated = await prisma.contract.update({
      where: { id },
      data: { depositConfirmed: true },
      include: contractWithLockInclude,
    });

    res.json(decorateContract(updated));
  } catch (e) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Contract not found' });
    next(e);
  }
};

// POST /contracts/:id/lock — admin acquires or refreshes an edit lock
export const acquireContractLock = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');

    const updated = await acquireContractEditLock(id, req.user.id);
    res.json(attachDeposit(updated));
  } catch (e) { next(e); }
};

// DELETE /contracts/:id/lock — admin releases their edit lock
export const releaseContractLock = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');

    const updated = await releaseContractEditLock(id, req.user.id);
    res.json(attachDeposit(updated));
  } catch (e) { next(e); }
};
