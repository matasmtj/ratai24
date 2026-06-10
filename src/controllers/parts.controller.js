import prisma from '../models/db.js';
import { badRequest, notFound } from '../errors.js';
import { IMAGE_DISPLAY_ORDER } from '../utils/imageOrdering.js';

const asInt = (v) => { const n = Number(v); return Number.isInteger(n) ? n : null; };
const asNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const isOptionalString = (v) => v === undefined || v === null || typeof v === 'string';

const PartCondition = ['NEW', 'USED', 'DAMAGED'];
const FuelType = ['PETROL', 'PETROL_LPG', 'DIESEL', 'ELECTRIC', 'HYBRID_HEV', 'HYBRID_PHEV'];
const Gearbox = ['MANUAL', 'AUTOMATIC'];
const BodyType = [
  'SEDAN', 'HATCHBACK', 'SUV', 'WAGON', 'COUPE', 'CONVERTIBLE', 'VAN', 'PICKUP',
  'MINIBUS_PASSENGER', 'MINIBUS_CARGO',
];

const partInclude = {
  images: {
    orderBy: IMAGE_DISPLAY_ORDER,
  },
};

function formatPart(part) {
  return {
    ...part,
    price: part.price != null ? Number(part.price) : part.price,
  };
}

function validatePartPayload(body, { isCreate }) {
  const {
    partName, oemNumber, make, model, year, colour,
    engineCapacityL, powerKW, fuelType, gearbox, bodyType,
    description, condition, price,
  } = body;

  if (isCreate) {
    if (!isNonEmptyString(partName)) throw badRequest('partName is required');
    if (!isNonEmptyString(make)) throw badRequest('make is required');
    if (!isNonEmptyString(model)) throw badRequest('model is required');
    const y = asInt(year);
    if (y === null) throw badRequest('year must be an integer');
    const p = asNum(price);
    if (p === null || p < 0) throw badRequest('price must be a non-negative number');
    if (!PartCondition.includes(condition)) throw badRequest('condition must be NEW, USED, or DAMAGED');
  }

  if (partName !== undefined && !isNonEmptyString(partName)) throw badRequest('partName must be a non-empty string');
  if (make !== undefined && !isNonEmptyString(make)) throw badRequest('make must be a non-empty string');
  if (model !== undefined && !isNonEmptyString(model)) throw badRequest('model must be a non-empty string');
  if (year !== undefined && asInt(year) === null) throw badRequest('year must be an integer');
  if (price !== undefined) {
    const p = asNum(price);
    if (p === null || p < 0) throw badRequest('price must be a non-negative number');
  }
  if (condition !== undefined && !PartCondition.includes(condition)) {
    throw badRequest('condition must be NEW, USED, or DAMAGED');
  }
  if (!isOptionalString(oemNumber)) throw badRequest('oemNumber must be a string');
  if (!isOptionalString(colour)) throw badRequest('colour must be a string');
  if (!isOptionalString(description)) throw badRequest('description must be a string');
  if (fuelType !== undefined && fuelType !== null && !FuelType.includes(fuelType)) {
    throw badRequest('Invalid fuelType');
  }
  if (gearbox !== undefined && gearbox !== null && !Gearbox.includes(gearbox)) {
    throw badRequest('Invalid gearbox');
  }
  if (bodyType !== undefined && bodyType !== null && !BodyType.includes(bodyType)) {
    throw badRequest('Invalid bodyType');
  }
  if (engineCapacityL !== undefined && engineCapacityL !== null && asNum(engineCapacityL) === null) {
    throw badRequest('engineCapacityL must be a number');
  }
  if (powerKW !== undefined && powerKW !== null && asInt(powerKW) === null) {
    throw badRequest('powerKW must be an integer');
  }
}

function buildPartData(body) {
  const data = {};
  if (body.partName !== undefined) data.partName = body.partName.trim();
  if (body.oemNumber !== undefined) data.oemNumber = body.oemNumber?.trim() || null;
  if (body.make !== undefined) data.make = body.make.trim();
  if (body.model !== undefined) data.model = body.model.trim();
  if (body.year !== undefined) data.year = asInt(body.year);
  if (body.colour !== undefined) data.colour = body.colour?.trim() || null;
  if (body.engineCapacityL !== undefined) data.engineCapacityL = body.engineCapacityL === null ? null : asNum(body.engineCapacityL);
  if (body.powerKW !== undefined) data.powerKW = body.powerKW === null ? null : asInt(body.powerKW);
  if (body.fuelType !== undefined) data.fuelType = body.fuelType || null;
  if (body.gearbox !== undefined) data.gearbox = body.gearbox || null;
  if (body.bodyType !== undefined) data.bodyType = body.bodyType || null;
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.condition !== undefined) data.condition = body.condition;
  if (body.price !== undefined) data.price = asNum(body.price);
  return data;
}

export const listParts = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.make) where.make = req.query.make;
    if (req.query.model) where.model = req.query.model;
    if (req.query.year !== undefined) {
      const y = asInt(req.query.year);
      if (y === null) throw badRequest('year must be an integer');
      where.year = y;
    }
    if (req.query.condition) {
      if (!PartCondition.includes(req.query.condition)) throw badRequest('Invalid condition');
      where.condition = req.query.condition;
    }
    if (req.query.search) {
      const q = req.query.search.trim();
      where.OR = [
        { partName: { contains: q, mode: 'insensitive' } },
        { make: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { oemNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    const parts = await prisma.part.findMany({
      where,
      include: partInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json(parts.map(formatPart));
  } catch (e) {
    next(e);
  }
};

export const getPart = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');

    const part = await prisma.part.findUnique({ where: { id }, include: partInclude });
    if (!part) throw notFound('Part not found');
    res.json(formatPart(part));
  } catch (e) {
    next(e);
  }
};

export const createPart = async (req, res, next) => {
  try {
    validatePartPayload(req.body, { isCreate: true });
    const part = await prisma.part.create({
      data: buildPartData(req.body),
      include: partInclude,
    });
    res.status(201).json(formatPart(part));
  } catch (e) {
    next(e);
  }
};

export const updatePart = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');

    const existing = await prisma.part.findUnique({ where: { id } });
    if (!existing) throw notFound('Part not found');

    validatePartPayload(req.body, { isCreate: false });
    const part = await prisma.part.update({
      where: { id },
      data: buildPartData(req.body),
      include: partInclude,
    });
    res.json(formatPart(part));
  } catch (e) {
    next(e);
  }
};

export const deletePart = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');

    const existing = await prisma.part.findUnique({ where: { id } });
    if (!existing) throw notFound('Part not found');

    await prisma.part.delete({ where: { id } });
    res.json({ message: 'Part deleted successfully' });
  } catch (e) {
    next(e);
  }
};
