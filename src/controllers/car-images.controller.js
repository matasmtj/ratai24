import prisma from '../models/db.js';
import { badRequest, notFound } from '../errors.js';
import { cloudinary } from '../middlewares/upload.middleware.js';

const asInt = (v) => { const n = Number(v); return Number.isInteger(n) ? n : null; };

// POST /cars/:carId/images - Upload image(s) for a car
export const uploadCarImages = async (req, res, next) => {
  try {
    const carId = asInt(req.params.carId);
    if (carId === null) throw badRequest('carId must be an integer');

    // Car already validated by setCarFolder middleware
    const car = req.carInfo;

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      throw badRequest('No files uploaded. Please upload at least one image.');
    }

    // Check if car already has a main image
    const existingMain = await prisma.carImage.findFirst({
      where: { carId, isMain: true }
    });

    // Create database records for uploaded images
    const images = await Promise.all(
      req.files.map(async (file, index) => {
        // First uploaded image becomes main if no main image exists
        const isMain = !existingMain && index === 0;
        
        return prisma.carImage.create({
          data: {
            carId,
            filename: file.filename,
            url: file.path, // Cloudinary URL
            isMain
          }
        });
      })
    );

    res.status(201).json({ 
      message: `${images.length} image(s) uploaded successfully`,
      images 
    });
  } catch (e) {
    // Cloudinary handles cleanup automatically on error
    next(e);
  }
};

// GET /cars/:carId/images - List all images for a car
export const listCarImages = async (req, res, next) => {
  try {
    const carId = asInt(req.params.carId);
    if (carId === null) throw badRequest('carId must be an integer');

    // Check if car exists
    const car = await prisma.car.findUnique({ where: { id: carId } });
    if (!car) throw notFound('Car not found');

    const images = await prisma.carImage.findMany({
      where: { carId },
      orderBy: [
        { isMain: 'desc' }, // Main image first
        { createdAt: 'asc' }
      ]
    });

    res.json({ images });
  } catch (e) {
    next(e);
  }
};

// PUT /cars/:carId/images/:imageId/main - Set image as main
export const setMainImage = async (req, res, next) => {
  try {
    const carId = asInt(req.params.carId);
    const imageId = asInt(req.params.imageId);
    
    if (carId === null) throw badRequest('carId must be an integer');
    if (imageId === null) throw badRequest('imageId must be an integer');

    // Check if image exists and belongs to this car
    const image = await prisma.carImage.findUnique({ where: { id: imageId } });
    if (!image) throw notFound('Image not found');
    if (image.carId !== carId) throw badRequest('Image does not belong to this car');

    // Use transaction to ensure atomicity
    const [, updatedImage] = await prisma.$transaction([
      // Remove isMain from all images of this car
      prisma.carImage.updateMany({
        where: { carId },
        data: { isMain: false }
      }),
      // Set this image as main
      prisma.carImage.update({
        where: { id: imageId },
        data: { isMain: true }
      })
    ]);

    res.json({ 
      message: 'Main image updated successfully',
      image: updatedImage 
    });
  } catch (e) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Image not found' });
    next(e);
  }
};

// DELETE /cars/:carId/images/:imageId - Delete an image
export const deleteCarImage = async (req, res, next) => {
  try {
    const carId = asInt(req.params.carId);
    const imageId = asInt(req.params.imageId);
    
    if (carId === null) throw badRequest('carId must be an integer');
    if (imageId === null) throw badRequest('imageId must be an integer');

    // Check if image exists and belongs to this car
    const image = await prisma.carImage.findUnique({ where: { id: imageId } });
    if (!image) throw notFound('Image not found');
    if (image.carId !== carId) throw badRequest('Image does not belong to this car');

    // If deleting main image, set another image as main
    if (image.isMain) {
      const otherImage = await prisma.carImage.findFirst({
        where: { 
          carId,
          id: { not: imageId }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (otherImage) {
        await prisma.carImage.update({
          where: { id: otherImage.id },
          data: { isMain: true }
        });
      }
    }

    // Delete from database
    await prisma.carImage.delete({ where: { id: imageId } });

    // Delete file from Cloudinary
    try {
      // Extract public_id from Cloudinary URL
      // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{filename}.{format}
      const urlParts = image.url.split('/');
      const uploadIndex = urlParts.findIndex(part => part === 'upload');
      
      if (uploadIndex !== -1) {
        // Get everything after 'upload/v{version}/'
        const pathParts = urlParts.slice(uploadIndex + 2); // Skip 'upload' and version
        const fileWithExt = pathParts.join('/');
        const publicId = fileWithExt.substring(0, fileWithExt.lastIndexOf('.'));
        
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (unlinkErr) {
      console.error('Error deleting file from Cloudinary:', unlinkErr);
      // Continue even if file deletion fails
    }

    res.json({ 
      message: 'Image deleted successfully',
      image 
    });
  } catch (e) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Image not found' });
    next(e);
  }
};
