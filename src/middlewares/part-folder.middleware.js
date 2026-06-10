import prisma from '../models/db.js';
import { badRequest, notFound } from '../errors.js';

const asInt = (v) => { const n = Number(v); return Number.isInteger(n) ? n : null; };

export const setPartFolder = async (req, res, next) => {
  try {
    const partId = asInt(req.params.partId);
    if (partId === null) throw badRequest('partId must be an integer');

    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw notFound('Part not found');

    const folderName = `${part.make}_${part.model}_${part.id}`
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .toLowerCase();

    req.cloudinaryFolder = `car-parts-images/${folderName}`;
    req.partInfo = part;
    next();
  } catch (e) {
    next(e);
  }
};
