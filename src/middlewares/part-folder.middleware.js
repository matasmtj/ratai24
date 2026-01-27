import prisma from '../models/db.js';
import { badRequest, notFound } from '../errors.js';

const asInt = (v) => { const n = Number(v); return Number.isInteger(n) ? n : null; };

// Middleware to set Cloudinary folder based on part info
export const setPartFolder = async (req, res, next) => {
  try {
    const partId = asInt(req.params.partId);
    if (partId === null) throw badRequest('partId must be an integer');

    // Fetch part details
    const part = await prisma.part.findUnique({ 
      where: { id: partId }
    });
    
    if (!part) throw notFound('Part not found');

    // Create folder name: make_model_year_partname_id (sanitized for Cloudinary)
    const folderName = `${part.make}_${part.model}_${part.year}_${part.partName}_${part.id}`
      .replace(/\s+/g, '-')  // Replace spaces with hyphens
      .replace(/[^a-zA-Z0-9_-]/g, '') // Remove special characters
      .toLowerCase();

    // Set folder name in request for multer to use
    req.cloudinaryFolder = `car-lease-parts/${folderName}`;
    req.partInfo = part; // Also attach part info for controller use

    next();
  } catch (e) {
    next(e);
  }
};
