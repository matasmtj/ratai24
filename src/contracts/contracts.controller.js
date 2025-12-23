import { PrismaClient } from '@prisma/client';
import { badRequest, notFound } from '../errors.js';

const prisma = new PrismaClient();

const asInt = (v) => { const n = Number(v); return Number.isInteger(n) ? n : null; };
const asNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

const ContractState = ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

const isOwnerOrAdmin = (req, userId) => {
  if (!req.user) return true;            // auth off → allow
  if (req.user.role === 'ADMIN') return true;
  return req.user.id === userId;
};

// GET /contracts
export const listContracts = async (req, res, next) => {
  try {
    const { userId, state, carId } = req.query;
    
    const where = {};
    
    // Filter by userId (for admin to see specific user's contracts)
    if (userId) {
      const userIdNum = asInt(userId);
      if (userIdNum !== null) {
        where.userId = userIdNum;
      }
    }
    
    // Filter by state
    if (state && ContractState.includes(state)) {
      where.state = state;
    }
    
    // Filter by carId
    if (carId) {
      const carIdNum = asInt(carId);
      if (carIdNum !== null) {
        where.carId = carIdNum;
      }
    }
    
    const items = await prisma.contract.findMany({
      where,
      include: {
        car: {
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            vin: true,
            numberPlate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json(items);
  } catch (e) { next(e); }
};

// GET /contracts/:id
export const getContract = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');

    const item = await prisma.contract.findUnique({ where: { id } });
    if (!item) throw notFound('Contract not found');

    if (!isOwnerOrAdmin(req, item.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(item);
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

    // dates
    const sd = new Date(startDate), ed = new Date(endDate);
    if (isNaN(sd) || isNaN(ed) || ed <= sd) throw badRequest('Invalid dates');

    // notes (optional string)
    if (notes !== undefined && !isNonEmptyString(notes)) throw badRequest('notes must be a non-empty string');

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const days = Math.max(1, Math.ceil(( ed - sd ) / MS_PER_DAY));
    const totalPrice = days * car.pricePerDay;

    const userId = req.user?.id ?? 1;

    const created = await prisma.contract.create({
      data: {
        userId,
        carId: car.id,
        startDate: sd,
        endDate: ed,
        totalPrice,
        state: 'ACTIVE',
        mileageStartKm: msKm,
        fuelLevelStartPct: flPct,
        ...(notes ? { notes: notes.trim() } : {}),
      }
    });

    res.status(201).json(created);
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

    const current = await prisma.contract.findUnique({ where: { id } });
    if (!current) throw notFound('Contract not found');

    if (!isOwnerOrAdmin(req, current.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
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

    // car (optional) + FK
    const newCarId = carId !== undefined ? asInt(carId) : current.carId;
    if (newCarId === null) throw badRequest('carId must be an integer');
    const car = await prisma.car.findUnique({ where: { id: newCarId } });
    if (!car) throw badRequest('Invalid carId');

    // state enum (optional)
    if (state !== undefined && !ContractState.includes(state)) {
      throw badRequest(`state must be one of: ${ContractState.join(', ')}`);
    }

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const days = Math.max(1, Math.ceil(( newEnd - newStart ) / MS_PER_DAY));
    const totalPrice = days * car.pricePerDay;

    const upd = {
      carId: newCarId,
      startDate: newStart,
      endDate: newEnd,
      totalPrice
    };

    if (mileageEndKm != null) {
      const endKm = asInt(mileageEndKm);
      if (endKm === null || endKm < 0) throw badRequest('mileageEndKm must be a non-negative integer');
      upd.mileageEndKm = endKm;
    }
    if (fuelLevelEndPct != null) {
      const fl = asInt(fuelLevelEndPct);
      if (fl === null || fl < 0 || fl > 100) throw badRequest('fuelLevelEndPct must be 0..100');
      upd.fuelLevelEndPct = fl;
    }
    if (state !== undefined) upd.state = state;
    if (notes !== undefined) {
      if (!isNonEmptyString(notes)) throw badRequest('notes must be a non-empty string');
      upd.notes = notes.trim();
    }

    const updated = await prisma.contract.update({ where: { id }, data: upd });
    res.json(updated);
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

    const item = await prisma.contract.findUnique({ where: { id } });
    if (!item) throw notFound('Contract not found');

    if (!isOwnerOrAdmin(req, item.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.contract.delete({ where: { id } });
    res.status(200).json(item);
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

    const current = await prisma.contract.findUnique({ where: { id } });
    if (!current) throw notFound('Contract not found');

    if (!isOwnerOrAdmin(req, current.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
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

    if (notes !== undefined && !isNonEmptyString(notes)) throw badRequest('notes must be a non-empty string');

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

    const updated = await prisma.contract.update({
      where: { id },
      data: {
        mileageEndKm: endKm,
        fuelLevelEndPct: endFuel,
        extraFees,
        state: 'COMPLETED',
        ...(notes !== undefined ? { notes: notes.trim() } : {})
      }
    });

    await prisma.car.update({
      where: { id: current.carId },
      data: { odometerKm: endKm, state: 'MAINTENANCE' }
    });

    res.json(updated);
  } catch (e) { next(e); }
};
