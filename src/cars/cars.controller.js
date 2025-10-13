import { PrismaClient } from '@prisma/client';
import { badRequest, notFound } from '../errors.js';
const prisma = new PrismaClient();

const carPublic = {
  id: true, make: true, model: true, year: true, pricePerDay: true, cityId: true,
  seatCount: true, fuelType: true, powerKW: true, engineCapacityL: true,
  bodyType: true, gearbox: true, state: true, odometerKm: true
};

export const listCars = async (req,res,next)=>{ try{
  const where = req.query.cityId ? { cityId: Number(req.query.cityId) } : {};
  const items = await prisma.car.findMany({ where, select: carPublic });
  res.json(items);
}catch(e){ next(e);}};

export const getCar = async (req,res,next)=>{ try{
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw badRequest('id must be an integer');
  const car = await prisma.car.findUnique({ where:{ id }, select: carPublic });
  if (!car) throw notFound('Car not found');
  res.json(car);
}catch(e){ next(e);}};

export const createCar = async (req, res, next) => {
  try {
    const { make, model, year, pricePerDay, cityId,
      seatCount = 5, fuelType, powerKW, engineCapacityL = null,
      bodyType, gearbox, state = 'AVAILABLE', odometerKm = 0 } = req.body || {};

    // basic validation
    if (!make || !model || !year || !pricePerDay || !cityId || !fuelType || !powerKW || !bodyType || !gearbox) {
      throw badRequest('Required: make, model, year, pricePerDay, cityId, fuelType, powerKW, bodyType, gearbox');
    }
    if (fuelType === 'ELECTRIC' && engineCapacityL !== null) {
      throw badRequest('engineCapacityL must be null for ELECTRIC');
    }

    const created = await prisma.car.create({
      data: { make, model, year, pricePerDay, cityId, seatCount, fuelType, powerKW, engineCapacityL, bodyType, gearbox, state, odometerKm },
      select: carPublic
    });
    res.status(201).json(created);
  } catch (e) { next(e); }
};

export const updateCar = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = req.body || {};
    if (data.fuelType === 'ELECTRIC') data.engineCapacityL = null; // normalize
    const updated = await prisma.car.update({ where: { id }, data, select: carPublic });
    res.json(updated);
  } catch (e) { next(e); }
};

// returns deleted car (200)
export const deleteCar = async (req,res,next)=>{ try{
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw badRequest('id must be an integer');
  const car = await prisma.car.findUnique({ where:{ id }, select: carPublic });
  if (!car) throw notFound('Car not found');
  await prisma.car.delete({ where:{ id } });
  res.status(200).json(car);
}catch(e){ next(e);}};

export const listContractsForCar = async (req,res,next)=>{ try{
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw badRequest('id must be an integer');
  const car = await prisma.car.findUnique({ where:{ id }, include:{ contracts:true } });
  if (!car) throw notFound('Car not found');
  res.json(car.contracts);
}catch(e){ next(e); }};
