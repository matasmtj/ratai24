import { PrismaClient } from '@prisma/client';
import { badRequest, notFound } from '../errors.js';
const prisma = new PrismaClient();

const cityPublic = { id: true, name: true, country: true };

export const listCities = async (req,res,next)=>{ try{
  const items = await prisma.city.findMany({ select: cityPublic });
  res.json(items);
}catch(e){ next(e);}};

export const getCity = async (req,res,next)=>{ try{
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw badRequest('id must be an integer');
  const city = await prisma.city.findUnique({ where:{ id }, select: cityPublic });
  if (!city) throw notFound('City not found');
  res.json(city);
}catch(e){ next(e);}};

export const createCity = async (req,res,next)=>{ try{
  const { name, country } = req.body || {};
  if (!name || !country) throw badRequest('name and country are required');
  const created = await prisma.city.create({ data:{ name, country }, select: cityPublic });
  res.status(201).json(created);
}catch(e){ next(e);}};

export const updateCity = async (req,res,next)=>{ try{
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw badRequest('id must be an integer');
  const { name, country } = req.body || {};
  const updated = await prisma.city.update({ where:{ id }, data:{ name, country }, select: cityPublic });
  res.json(updated);
}catch(e){ next(e);}};

// 👇 changed: return 200 with deleted city payload (no 204)
export const deleteCity = async (req,res,next)=>{ try{
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw badRequest('id must be an integer');
  // fetch first so you can return the "public" fields
  const city = await prisma.city.findUnique({ where:{ id }, select: cityPublic });
  if (!city) throw notFound('City not found');
  await prisma.city.delete({ where:{ id } });
  res.status(200).json(city); // now you see what was deleted
}catch(e){ next(e);}};

// hierarchical
export const listCarsInCity = async (req,res,next)=>{ try{
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw badRequest('id must be an integer');
  const city = await prisma.city.findUnique({ where:{ id }, include:{ cars:true } });
  if (!city) throw notFound('City not found');
  res.json(city.cars);
}catch(e){ next(e);}};
