import { PrismaClient } from '@prisma/client';
import { badRequest, notFound } from '../errors.js';
const prisma = new PrismaClient();

export const listContracts = async (req,res,next)=>{ try{
  const items = await prisma.contract.findMany();
  res.json(items);
}catch(e){ next(e);}};

export const getContract = async (req,res,next)=>{ try{
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw badRequest('id must be an integer');
  const item = await prisma.contract.findUnique({ where:{ id } });
  if (!item) throw notFound('Contract not found');
  // owner or admin
  if (req.user?.role !== 'ADMIN' && item.userId !== req.user?.id) return res.status(403).json({ error: 'Forbidden' });
  res.json(item);
}catch(e){ next(e);}};

export const createContract = async (req,res,next)=>{ try{
  const { carId, startDate, endDate, mileageStartKm, fuelLevelStartPct } = req.body || {};
    if (!carId || !startDate || !endDate) throw badRequest('carId, startDate, endDate are required');
    if (mileageStartKm == null || fuelLevelStartPct == null) throw badRequest('mileageStartKm and fuelLevelStartPct are required');
  const car = await prisma.car.findUnique({ where:{ id:Number(carId) } });
  if (!car) throw badRequest('Invalid carId');
  const sd = new Date(startDate), ed = new Date(endDate);
  if (isNaN(sd) || isNaN(ed) || ed <= sd) throw badRequest('Invalid dates');
  const days = Math.ceil((ed - sd) / (1000*60*60*24));
  const totalPrice = days * car.pricePerDay;
  const created = await prisma.contract.create({
      data: {
        userId: req.user.id, carId: car.id, startDate: sd, endDate: ed,
        totalPrice, state: 'ACTIVE',
        mileageStartKm, fuelLevelStartPct
      }
    });
  res.status(201).json(created);
}catch(e){ next(e);}};

export const updateContract = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw badRequest('id must be an integer');

    // Load current contract
    const current = await prisma.contract.findUnique({ where: { id } });
    if (!current) throw notFound('Contract not found');

    // Owner or admin
    if (req.user?.role !== 'ADMIN' && current.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Accept partial updates
    const {
      startDate, endDate, carId, state,
      mileageEndKm, fuelLevelEndPct, notes
    } = req.body || {};

    // Resolve final dates
    const newStart = startDate ? new Date(startDate) : current.startDate;
    const newEnd   = endDate   ? new Date(endDate)   : current.endDate;
    if (isNaN(newStart) || isNaN(newEnd) || newEnd <= newStart) {
      throw badRequest('Invalid dates');
    }

    // Resolve car
    const newCarId = carId ? Number(carId) : current.carId;
    if (!Number.isInteger(newCarId)) throw badRequest('carId must be an integer');
    const car = await prisma.car.findUnique({ where: { id: newCarId } });
    if (!car) throw badRequest('Invalid carId');

    // Recalculate price based on new dates & car
    const days = Math.ceil((newEnd - newStart) / (1000 * 60 * 60 * 24));
    const totalPrice = days * car.pricePerDay;

    // Optional fields validation
    const data = {
      carId: newCarId,
      startDate: newStart,
      endDate: newEnd,
      totalPrice
    };

    if (state) data.state = state; // DRAFT/ACTIVE/COMPLETED/CANCELLED
    if (mileageEndKm != null) {
      if (!Number.isInteger(Number(mileageEndKm)) || Number(mileageEndKm) < 0) {
        throw badRequest('mileageEndKm must be a non-negative integer');
      }
      data.mileageEndKm = Number(mileageEndKm);
    }
    if (fuelLevelEndPct != null) {
      const fl = Number(fuelLevelEndPct);
      if (!Number.isFinite(fl) || fl < 0 || fl > 100) throw badRequest('fuelLevelEndPct must be 0..100');
      data.fuelLevelEndPct = fl;
    }
    if (notes !== undefined) data.notes = String(notes);

    const updated = await prisma.contract.update({ where: { id }, data });
    res.json(updated);
  } catch (e) { next(e); }
};

//returns deleted contract (200)
export const deleteContract = async (req,res,next)=>{ try{
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw badRequest('id must be an integer');
  const item = await prisma.contract.findUnique({ where:{ id } });
  if (!item) throw notFound('Contract not found');
  if (req.user?.role !== 'ADMIN' && item.userId !== req.user?.id) return res.status(403).json({ error: 'Forbidden' });
  await prisma.contract.delete({ where:{ id } });
  res.status(200).json(item);
}catch(e){ next(e);}};

// --- Complete a contract: set end metrics, compute fees, close it ---
export const completeContract = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw badRequest('id must be an integer');

    // Load current contract + car
    const current = await prisma.contract.findUnique({ where: { id } });
    if (!current) throw notFound('Contract not found');

    // Owner or admin
    if (req.user?.role !== 'ADMIN' && current.userId !== req.user?.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Only ACTIVE contracts can be completed (adjust if you allow DRAFT)
    if (current.state && current.state !== 'ACTIVE') {
      return res.status(409).json({ error: `Cannot complete contract in state ${current.state}` });
    }

    // Input
    const { mileageEndKm, fuelLevelEndPct, damageFee = 0, notes } = req.body || {};

    // Validate inputs
    const endKm = Number(mileageEndKm);
    const endFuel = Number(fuelLevelEndPct);
    if (!Number.isInteger(endKm) || endKm < 0) throw badRequest('mileageEndKm must be a non-negative integer');
    if (!Number.isFinite(endFuel) || endFuel < 0 || endFuel > 100) throw badRequest('fuelLevelEndPct must be 0..100');
    if (endKm < current.mileageStartKm) throw badRequest('mileageEndKm cannot be less than mileageStartKm');

    const dmgFee = Number(damageFee);
    if (!Number.isFinite(dmgFee) || dmgFee < 0) throw badRequest('damageFee must be a non-negative number');

    // Load car to recalc pricing context if needed
    const car = await prisma.car.findUnique({ where: { id: current.carId } });
    if (!car) throw badRequest('Linked car not found');

    // --- Fee policy (tweak anytime) ---
    // Allowance: 200 km / day. Extra km cost: €0.10 / km.
    // Fuel: if returned with less fuel than start, €1.00 per % below start.
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const days = Math.max(1, Math.ceil((current.endDate - current.startDate) / MS_PER_DAY));
    const allowanceKm = 200 * days;

    const drivenKm = endKm - current.mileageStartKm;
    const extraKm = Math.max(0, drivenKm - allowanceKm);
    const perKmFee = 0.10;
    const extraKmFee = extraKm * perKmFee;

    const fuelDeltaPct = Math.max(0, (current.fuelLevelStartPct ?? 0) - endFuel);
    const perPercentFuelFee = 1.0;
    const fuelFee = fuelDeltaPct * perPercentFuelFee;

    const extraFees = parseFloat((extraKmFee + fuelFee + dmgFee).toFixed(2));

    // Update contract to COMPLETED with metrics & fees
    const updated = await prisma.contract.update({
      where: { id },
      data: {
        mileageEndKm: endKm,
        fuelLevelEndPct: endFuel,
        extraFees,
        state: 'COMPLETED',
        ...(notes !== undefined ? { notes: String(notes) } : {}),
      }
    });

    // Update car odometer + send to MAINTENANCE for inspection
    await prisma.car.update({
      where: { id: current.carId },
      data: { odometerKm: endKm, state: 'MAINTENANCE' }
    });

    // Respond with the completed contract
    res.json(updated);
  } catch (e) { next(e); }
};