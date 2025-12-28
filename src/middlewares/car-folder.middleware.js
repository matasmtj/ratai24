import prisma from '../models/db.js';
import { badRequest, notFound } from '../errors.js';

const asInt = (v) => { const n = Number(v); return Number.isInteger(n) ? n : null; };

// Middleware to set Cloudinary folder based on car info
export const setCarFolder = async (req, res, next) => {
  try {
    const carId = asInt(req.params.carId);
    if (carId === null) throw badRequest('carId must be an integer');

    // Fetch car details
    const car = await prisma.car.findUnique({ 
      where: { id: carId }
    });
    
    if (!car) throw notFound('Car not found');

    // Create folder name: make_model_year_id (sanitized for Cloudinary)
    const folderName = `${car.make}_${car.model}_${car.year}_${car.id}`
      .replace(/\s+/g, '-')  // Replace spaces with hyphens
      .replace(/[^a-zA-Z0-9_-]/g, '') // Remove special characters
      .toLowerCase();

    // Set folder name in request for multer to use
    req.cloudinaryFolder = `car-lease-images/${folderName}`;
    req.carInfo = car; // Also attach car info for controller use

    next();
  } catch (e) {
    next(e);
  }
};
