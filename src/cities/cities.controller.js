import prisma from '../models/db.js';
import { badRequest, notFound } from '../errors.js';

const asInt = (v) => { const n = Number(v); return Number.isInteger(n) ? n : null; };
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

const cityPublic = { id: true, name: true, country: true };

// GET /cities
export const listCities = async (req, res, next) => {
  try {
    const items = await prisma.city.findMany({ select: cityPublic });
    res.json(items);
  } catch (e) { next(e); }
};

// GET /cities/:id
export const getCity = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');
    const city = await prisma.city.findUnique({ where: { id }, select: cityPublic });
    if (!city) throw notFound('City not found');
    res.json(city);
  } catch (e) { next(e); }
};

// POST /cities
export const createCity = async (req, res, next) => {
  try {
    const body = req.body ?? {};
    if (typeof body !== 'object' || Array.isArray(body)) throw badRequest('body must be an object');

    const { name, country } = body;
    if (!isNonEmptyString(name))    throw badRequest('name must be a non-empty string');
    if (!isNonEmptyString(country)) throw badRequest('country must be a non-empty string');

    const created = await prisma.city.create({
      data: { name: name.trim(), country: country.trim() },
      select: cityPublic
    });
    res.status(201).json(created);
  } catch (e) {
    if (e?.code === 'P2002') return res.status(409).json({ error: 'City with this name already exists' });
    next(e);
  }
};

// PUT /cities/:id
export const updateCity = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');

    const body = req.body ?? {};
    if (typeof body !== 'object' || Array.isArray(body)) throw badRequest('body must be an object');

    const { name, country } = body;
    if (!isNonEmptyString(name))    throw badRequest('name must be a non-empty string');
    if (!isNonEmptyString(country)) throw badRequest('country must be a non-empty string');

    const exists = await prisma.city.findUnique({ where: { id } });
    if (!exists) throw notFound('City not found');

    const updated = await prisma.city.update({
      where: { id },
      data: { name: name.trim(), country: country.trim() },
      select: cityPublic
    });
    res.json(updated);
  } catch (e) {
    if (e?.code === 'P2002') return res.status(409).json({ error: 'City with this name already exists' });
    if (e?.code === 'P2025') return res.status(404).json({ error: 'City not found' });
    next(e);
  }
};

// DELETE /cities/:id
export const deleteCity = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');

    const city = await prisma.city.findUnique({ where: { id }, select: cityPublic });
    if (!city) throw notFound('City not found');

    await prisma.city.delete({ where: { id } });
    res.status(200).json(city);
  } catch (e) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'City not found' });
    next(e);
  }
};

// GET /cities/:id/cars
export const listCarsInCity = async (req, res, next) => {
  try {
    const id = asInt(req.params.id);
    if (id === null) throw badRequest('id must be an integer');

    const city = await prisma.city.findUnique({ where: { id }, include: { cars: true } });
    if (!city) throw notFound('City not found');
    res.json(city.cars);
  } catch (e) { next(e); }
};
