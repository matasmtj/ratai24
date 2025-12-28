import prisma from '../models/db.js';
import { badRequest, notFound } from '../errors.js';

// -------- helpers --------
const asInt = (v) => { const n = Number(v); return Number.isInteger(n) ? n : null; };
const asNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const isVIN = (v) => typeof v === 'string' && v.trim().length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/.test(v.trim().toUpperCase());
const isPlate = (v) => typeof v === 'string' && /^[A-Z0-9\- ]{2,12}$/i.test(v.trim());
const inRange = (n, min, max) => typeof n === 'number' && n >= min && n <= max;

const FuelType = ['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID_HEV', 'HYBRID_PHEV'];
const Gearbox  = ['MANUAL', 'AUTOMATIC'];
const BodyType = ['SEDAN', 'HATCHBACK', 'SUV', 'WAGON', 'COUPE', 'CONVERTIBLE', 'VAN', 'PICKUP'];
const CarState = ['AVAILABLE', 'LEASED', 'MAINTENANCE'];

const carPublic = {
  id: true,
  vin: true,
  numberPlate: true,
  make: true, model: true, year: true, pricePerDay: true, cityId: true,
  seatCount: true, fuelType: true, powerKW: true, engineCapacityL: true,
  bodyType: true, gearbox: true, state: true, odometerKm: true,
  images: {
    select: {
      id: true,
      url: true,
      isMain: true,
      order: true,
      createdAt: true
    },
    orderBy: {
      order: 'asc'
    }
  }
};

// GET /cars?cityId=
export const listCars = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.cityId !== undefined) {
      const cid = asInt(req.query.cityId);
      if (cid === null) throw badRequest('cityId must be an integer');
      where.cityId = cid;
    }
    const items = await prisma.car.findMany({ where, select: carPublic });
    res.json(items);
  } catch (e) { next(e); }
};

// GET /cars/:id
export const getCar = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');
    const car = await prisma.car.findUnique({ where: { id }, select: carPublic });
    if (!car) throw notFound('Car not found');
    res.json(car);
  } catch (e) { next(e); }
};

// POST /cars
export const createCar = async (req, res, next) => {
  try {
    const body = req.body ?? {};
    if (typeof body !== 'object' || Array.isArray(body)) throw badRequest('body must be an object');

    const {
      vin, numberPlate,
      make, model, year, pricePerDay, cityId,
      seatCount = 5, fuelType, powerKW, engineCapacityL = null,
      bodyType, gearbox, state = 'AVAILABLE', odometerKm = 0
    } = body;

    // required strings
    if (!isVIN(vin)) throw badRequest('vin must be a valid 17-character VIN (A-HJ-NPR-Z, 0-9, no I/O/Q)');
    if (!isPlate(numberPlate)) throw badRequest('numberPlate must be 2–12 chars (letters/digits/-/space)');
    if (!isNonEmptyString(make))  throw badRequest('make must be a non-empty string');
    if (!isNonEmptyString(model)) throw badRequest('model must be a non-empty string');

    // numerics
    const yearInt = asInt(year);         
    if (yearInt === null) throw badRequest('year must be an integer');
    if (!inRange(yearInt, 1900, new Date().getFullYear() + 2)) {
      throw badRequest(`year must be between 1900 and ${new Date().getFullYear() + 2}`);
    }
    
    const price   = asNum(pricePerDay);  
    if (price   === null || price <= 0) throw badRequest('pricePerDay must be a positive number');
    
    const cid     = asInt(cityId);       
    if (cid     === null || cid <= 0) throw badRequest('cityId must be a positive integer');
    
    const seats   = asInt(seatCount);    
    if (seats   === null || !inRange(seats, 1, 20)) throw badRequest('seatCount must be between 1 and 20');
    
    const kw      = asInt(powerKW);      
    if (kw      === null || !inRange(kw, 1, 2000)) throw badRequest('powerKW must be between 1 and 2000');
    
    const odo     = asInt(odometerKm) ?? 0;
    if (odo < 0 || odo > 10000000) throw badRequest('odometerKm must be between 0 and 10,000,000');

    // enums
    if (!FuelType.includes(fuelType)) throw badRequest(`fuelType must be one of: ${FuelType.join(', ')}`);
    if (!Gearbox.includes(gearbox))   throw badRequest(`gearbox must be one of: ${Gearbox.join(', ')}`);
    if (!BodyType.includes(bodyType)) throw badRequest(`bodyType must be one of: ${BodyType.join(', ')}`);
    if (state && !CarState.includes(state)) throw badRequest(`state must be one of: ${CarState.join(', ')}`);

    // FK: city exists
    const city = await prisma.city.findUnique({ where: { id: cid } });
    if (!city) throw badRequest('Invalid cityId (city not found)');

    // engine capacity normalization
    let engineL = null;
    if (fuelType === 'ELECTRIC') {
      engineL = null;
      if (engineCapacityL !== null) throw badRequest('engineCapacityL must be null for ELECTRIC');
    } else {
      engineL = engineCapacityL === null ? null : asNum(engineCapacityL);
      if (engineL === null && engineCapacityL !== null) throw badRequest('engineCapacityL must be a number or null');
    }

    const created = await prisma.car.create({
      data: {
        vin: vin.trim().toUpperCase(),
        numberPlate: numberPlate.trim().toUpperCase(),
        make: make.trim(),
        model: model.trim(),
        year: yearInt,
        pricePerDay: price,
        cityId: cid,
        seatCount: seats,
        fuelType,
        powerKW: kw,
        engineCapacityL: engineL,
        bodyType,
        gearbox,
        state: state || 'AVAILABLE',
        odometerKm: odo
      },
      select: carPublic
    });
    res.status(201).json(created);
  } catch (e) {
    if (e?.code === 'P2002') {
      const tgt = Array.isArray(e.meta?.target) ? e.meta.target.join(',') : e.meta?.target;
      if (String(tgt).includes('vin')) return res.status(409).json({ error: 'VIN already exists' });
      if (String(tgt).includes('numberPlate')) return res.status(409).json({ error: 'numberPlate already exists' });
      return res.status(409).json({ error: 'Unique constraint violated' });
    }
    if (e?.code === 'P2003') return res.status(400).json({ error: 'Foreign key constraint (cityId) failed' });
    next(e);
  }
};

// PUT /cars/:id
export const updateCar = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');

    const exists = await prisma.car.findUnique({ where: { id } });
    if (!exists) throw notFound('Car not found');

    const data = { ...(req.body ?? {}) };
    if (typeof data !== 'object' || Array.isArray(data)) throw badRequest('body must be an object');

    // optional strings
    if (data.vin !== undefined && !isVIN(data.vin))                 throw badRequest('vin must be a valid 17-character VIN');
    if (data.numberPlate !== undefined && !isPlate(data.numberPlate)) throw badRequest('numberPlate must be 2–12 chars');
    if (data.make !== undefined && !isNonEmptyString(data.make))    throw badRequest('make must be a non-empty string');
    if (data.model !== undefined && !isNonEmptyString(data.model))  throw badRequest('model must be a non-empty string');

    // numerics
    if (data.cityId !== undefined) {
      const cid = asInt(data.cityId); if (cid === null) throw badRequest('cityId must be an integer');
      const city = await prisma.city.findUnique({ where: { id: cid } });
      if (!city) throw badRequest('Invalid cityId (city not found)');
      data.cityId = cid;
    }
    if (data.year !== undefined) {
      const y = asInt(data.year);
      if (y === null || !inRange(y, 1900, new Date().getFullYear() + 2)) {
        throw badRequest(`year must be between 1900 and ${new Date().getFullYear() + 2}`);
      }
      data.year = y;
    }
    if (data.pricePerDay !== undefined) {
      const p = asNum(data.pricePerDay);
      if (p === null || p <= 0) throw badRequest('pricePerDay must be a positive number');
      data.pricePerDay = p;
    }
    if (data.seatCount !== undefined) {
      const s = asInt(data.seatCount);
      if (s === null || !inRange(s, 1, 20)) throw badRequest('seatCount must be between 1 and 20');
      data.seatCount = s;
    }
    if (data.powerKW !== undefined) {
      const k = asInt(data.powerKW);
      if (k === null || !inRange(k, 1, 2000)) throw badRequest('powerKW must be between 1 and 2000');
      data.powerKW = k;
    }
    if (data.odometerKm !== undefined) {
      const o = asInt(data.odometerKm);
      if (o === null || o < 0 || o > 10000000) throw badRequest('odometerKm must be between 0 and 10,000,000');
      data.odometerKm = o;
    }

    // enums
    if (data.fuelType !== undefined && !FuelType.includes(data.fuelType))   throw badRequest(`fuelType must be one of: ${FuelType.join(', ')}`);
    if (data.gearbox  !== undefined && !Gearbox.includes(data.gearbox))     throw badRequest(`gearbox must be one of: ${Gearbox.join(', ')}`);
    if (data.bodyType !== undefined && !BodyType.includes(data.bodyType))   throw badRequest(`bodyType must be one of: ${BodyType.join(', ')}`);
    if (data.state    !== undefined && !CarState.includes(data.state))      throw badRequest(`state must be one of: ${CarState.join(', ')}`);

    // engine logic
    if (data.fuelType === 'ELECTRIC') data.engineCapacityL = null;
    if (data.engineCapacityL !== undefined && data.engineCapacityL !== null) {
      const ec = asNum(data.engineCapacityL);
      if (ec === null) throw badRequest('engineCapacityL must be a number'); data.engineCapacityL = ec;
    }

    // trim/normalize strings
    if (data.vin)         data.vin         = data.vin.trim().toUpperCase();
    if (data.numberPlate) data.numberPlate = data.numberPlate.trim().toUpperCase();
    if (data.make)        data.make        = data.make.trim();
    if (data.model)       data.model       = data.model.trim();

    const updated = await prisma.car.update({ where: { id }, data, select: carPublic });
    res.json(updated);
  } catch (e) {
    if (e?.code === 'P2002') {
      const tgt = Array.isArray(e.meta?.target) ? e.meta.target.join(',') : e.meta?.target;
      if (String(tgt).includes('vin')) return res.status(409).json({ error: 'VIN already exists' });
      if (String(tgt).includes('numberPlate')) return res.status(409).json({ error: 'numberPlate already exists' });
      return res.status(409).json({ error: 'Unique constraint violated' });
    }
    if (e?.code === 'P2003') return res.status(400).json({ error: 'Foreign key constraint (cityId) failed' });
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Car not found' });
    next(e);
  }
};

// DELETE /cars/:id
export const deleteCar = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');
    const car = await prisma.car.findUnique({ where: { id }, select: carPublic });
    if (!car) throw notFound('Car not found');

    await prisma.car.delete({ where: { id } });
    res.status(200).json(car);
  } catch (e) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Car not found' });
    next(e);
  }
};

// GET /cars/:id/contracts
export const listContractsForCar = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');
    const car = await prisma.car.findUnique({ where: { id }, include: { contracts: true } });
    if (!car) throw notFound('Car not found');
    res.json(car.contracts);
  } catch (e) { next(e); }
};

// PUT /cars/:id/images/reorder
export const reorderCarImages = async (req, res, next) => {
  try {
    const carId = asInt(req.params.id);
    if (carId === null) throw badRequest('carId must be an integer');

    const { imageIds } = req.body;
    
    // Validation
    if (!Array.isArray(imageIds)) {
      throw badRequest('imageIds must be an array');
    }
    if (imageIds.length === 0) {
      throw badRequest('imageIds array cannot be empty');
    }
    if (!imageIds.every(id => Number.isInteger(id))) {
      throw badRequest('All imageIds must be integers');
    }

    // Check if car exists
    const car = await prisma.car.findUnique({
      where: { id: carId },
      include: { images: true }
    });
    if (!car) throw notFound('Car not found');

    // Verify all image IDs belong to this car
    const carImageIds = car.images.map(img => img.id);
    const invalidIds = imageIds.filter(id => !carImageIds.includes(id));
    if (invalidIds.length > 0) {
      throw badRequest(`Images with IDs ${invalidIds.join(', ')} do not belong to this car`);
    }

    // Update order for each image
    const updatePromises = imageIds.map((imageId, index) =>
      prisma.carImage.update({
        where: { id: imageId },
        data: { order: index }
      })
    );

    await Promise.all(updatePromises);

    // Fetch updated images
    const updatedImages = await prisma.carImage.findMany({
      where: { carId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        url: true,
        isMain: true,
        order: true,
        createdAt: true
      }
    });

    res.json({
      message: 'Images reordered successfully',
      images: updatedImages
    });
  } catch (e) { next(e); }
};
