import { PrismaClient } from '@prisma/client';
import { badRequest, notFound } from '../errors.js';

const prisma = new PrismaClient();

// -------- helpers --------
const asInt = (v) => { const n = Number(v); return Number.isInteger(n) ? n : null; };
const asNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

const FuelType = ['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID_HEV', 'HYBRID_PHEV'];
const Gearbox = ['MANUAL', 'AUTOMATIC'];
const BodyType = ['SEDAN', 'HATCHBACK', 'SUV', 'WAGON', 'COUPE', 'CONVERTIBLE', 'VAN', 'PICKUP'];
const PartCondition = ['NEW', 'USED', 'REFURBISHED'];

const partPublic = {
  id: true,
  make: true,
  model: true,
  year: true,
  oem: true,
  partName: true,
  engineCapacityL: true,
  powerKW: true,
  fuelType: true,
  colour: true,
  gearbox: true,
  bodyType: true,
  description: true,
  condition: true,
  price: true,
  stockQuantity: true,
  createdAt: true,
  updatedAt: true,
  images: {
    select: {
      id: true,
      url: true,
      isMain: true,
      order: true,
      createdAt: true
    },
    orderBy: { order: 'asc' }
  }
};

// GET /parts
export const listParts = async (req, res, next) => {
  try {
    const where = {};

    // Filter by make
    if (req.query.make) {
      where.make = { contains: req.query.make, mode: 'insensitive' };
    }

    // Filter by model
    if (req.query.model) {
      where.model = { contains: req.query.model, mode: 'insensitive' };
    }

    // Filter by year
    if (req.query.year !== undefined) {
      const yearInt = asInt(req.query.year);
      if (yearInt === null) throw badRequest('year must be an integer');
      where.year = yearInt;
    }

    // Filter by OEM
    if (req.query.oem) {
      where.oem = { contains: req.query.oem, mode: 'insensitive' };
    }

    // Filter by partName
    if (req.query.partName) {
      where.partName = { contains: req.query.partName, mode: 'insensitive' };
    }

    // Filter by condition
    if (req.query.condition && PartCondition.includes(req.query.condition)) {
      where.condition = req.query.condition;
    }

    // Filter by price range
    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      where.price = {};
      if (req.query.minPrice !== undefined) {
        const minPrice = asNum(req.query.minPrice);
        if (minPrice === null) throw badRequest('minPrice must be a number');
        where.price.gte = minPrice;
      }
      if (req.query.maxPrice !== undefined) {
        const maxPrice = asNum(req.query.maxPrice);
        if (maxPrice === null) throw badRequest('maxPrice must be a number');
        where.price.lte = maxPrice;
      }
    }

    // Filter by stock availability
    if (req.query.inStock === 'true') {
      where.stockQuantity = { gt: 0 };
    }

    const items = await prisma.part.findMany({ 
      where, 
      select: partPublic,
      orderBy: { createdAt: 'desc' }
    });
    res.json(items);
  } catch (e) { next(e); }
};

// GET /parts/:id
export const getPart = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');
    
    const part = await prisma.part.findUnique({ where: { id }, select: partPublic });
    if (!part) throw notFound('Part not found');
    
    res.json(part);
  } catch (e) { next(e); }
};

// POST /parts
export const createPart = async (req, res, next) => {
  try {
    const body = req.body ?? {};
    if (typeof body !== 'object' || Array.isArray(body)) throw badRequest('body must be an object');

    const {
      make, model, year, oem, partName,
      engineCapacityL = null, powerKW = null, fuelType = null,
      colour = null, gearbox = null, bodyType = null,
      description = null, condition = 'USED', price, stockQuantity = 1
    } = body;

    // Required fields
    if (!isNonEmptyString(make)) throw badRequest('make must be a non-empty string');
    if (!isNonEmptyString(model)) throw badRequest('model must be a non-empty string');
    if (!isNonEmptyString(oem)) throw badRequest('oem must be a non-empty string');
    if (!isNonEmptyString(partName)) throw badRequest('partName must be a non-empty string');

    const yearInt = asInt(year);
    if (yearInt === null) throw badRequest('year must be an integer');

    const priceNum = asNum(price);
    if (priceNum === null || priceNum <= 0) throw badRequest('price must be a positive number');

    const stockInt = asInt(stockQuantity);
    if (stockInt === null || stockInt < 0) throw badRequest('stockQuantity must be a non-negative integer');

    // Optional enums
    if (fuelType && !FuelType.includes(fuelType)) throw badRequest(`fuelType must be one of: ${FuelType.join(', ')}`);
    if (gearbox && !Gearbox.includes(gearbox)) throw badRequest(`gearbox must be one of: ${Gearbox.join(', ')}`);
    if (bodyType && !BodyType.includes(bodyType)) throw badRequest(`bodyType must be one of: ${BodyType.join(', ')}`);
    if (!PartCondition.includes(condition)) throw badRequest(`condition must be one of: ${PartCondition.join(', ')}`);

    // Optional numerics
    const engineL = engineCapacityL !== null ? asNum(engineCapacityL) : null;
    if (engineCapacityL !== null && engineL === null) throw badRequest('engineCapacityL must be a number or null');

    const powerInt = powerKW !== null ? asInt(powerKW) : null;
    if (powerKW !== null && powerInt === null) throw badRequest('powerKW must be an integer or null');

    const created = await prisma.part.create({
      data: {
        make: make.trim(),
        model: model.trim(),
        year: yearInt,
        oem: oem.trim(),
        partName: partName.trim(),
        engineCapacityL: engineL,
        powerKW: powerInt,
        fuelType,
        colour: colour ? String(colour).trim() : null,
        gearbox,
        bodyType,
        description: description ? String(description).trim() : null,
        condition,
        price: priceNum,
        stockQuantity: stockInt
      },
      select: partPublic
    });

    res.status(201).json(created);
  } catch (e) { next(e); }
};

// PUT /parts/:id
export const updatePart = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');

    const exists = await prisma.part.findUnique({ where: { id } });
    if (!exists) throw notFound('Part not found');

    const data = { ...(req.body ?? {}) };
    if (typeof data !== 'object' || Array.isArray(data)) throw badRequest('body must be an object');

    // Validate optional fields
    if (data.make !== undefined && !isNonEmptyString(data.make)) throw badRequest('make must be a non-empty string');
    if (data.model !== undefined && !isNonEmptyString(data.model)) throw badRequest('model must be a non-empty string');
    if (data.oem !== undefined && !isNonEmptyString(data.oem)) throw badRequest('oem must be a non-empty string');
    if (data.partName !== undefined && !isNonEmptyString(data.partName)) throw badRequest('partName must be a non-empty string');

    if (data.year !== undefined) {
      const y = asInt(data.year);
      if (y === null) throw badRequest('year must be an integer');
      data.year = y;
    }

    if (data.price !== undefined) {
      const p = asNum(data.price);
      if (p === null || p <= 0) throw badRequest('price must be a positive number');
      data.price = p;
    }

    if (data.stockQuantity !== undefined) {
      const s = asInt(data.stockQuantity);
      if (s === null || s < 0) throw badRequest('stockQuantity must be a non-negative integer');
      data.stockQuantity = s;
    }

    if (data.engineCapacityL !== undefined && data.engineCapacityL !== null) {
      const ec = asNum(data.engineCapacityL);
      if (ec === null) throw badRequest('engineCapacityL must be a number or null');
      data.engineCapacityL = ec;
    }

    if (data.powerKW !== undefined && data.powerKW !== null) {
      const pk = asInt(data.powerKW);
      if (pk === null) throw badRequest('powerKW must be an integer or null');
      data.powerKW = pk;
    }

    // Enums
    if (data.fuelType !== undefined && data.fuelType !== null && !FuelType.includes(data.fuelType)) {
      throw badRequest(`fuelType must be one of: ${FuelType.join(', ')}`);
    }
    if (data.gearbox !== undefined && data.gearbox !== null && !Gearbox.includes(data.gearbox)) {
      throw badRequest(`gearbox must be one of: ${Gearbox.join(', ')}`);
    }
    if (data.bodyType !== undefined && data.bodyType !== null && !BodyType.includes(data.bodyType)) {
      throw badRequest(`bodyType must be one of: ${BodyType.join(', ')}`);
    }
    if (data.condition !== undefined && !PartCondition.includes(data.condition)) {
      throw badRequest(`condition must be one of: ${PartCondition.join(', ')}`);
    }

    // Trim strings
    if (data.make) data.make = data.make.trim();
    if (data.model) data.model = data.model.trim();
    if (data.oem) data.oem = data.oem.trim();
    if (data.partName) data.partName = data.partName.trim();
    if (data.colour !== undefined) data.colour = data.colour ? String(data.colour).trim() : null;
    if (data.description !== undefined) data.description = data.description ? String(data.description).trim() : null;

    const updated = await prisma.part.update({ where: { id }, data, select: partPublic });
    res.json(updated);
  } catch (e) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Part not found' });
    next(e);
  }
};

// DELETE /parts/:id
export const deletePart = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');
    
    const part = await prisma.part.findUnique({ where: { id }, select: partPublic });
    if (!part) throw notFound('Part not found');

    await prisma.part.delete({ where: { id } });
    res.status(200).json(part);
  } catch (e) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Part not found' });
    next(e);
  }
};
