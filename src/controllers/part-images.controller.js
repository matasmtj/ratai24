import prisma from '../models/db.js';
import { badRequest, notFound } from '../errors.js';
import { cloudinary } from '../middlewares/upload.middleware.js';

const asInt = (v) => { const n = Number(v); return Number.isInteger(n) ? n : null; };

// POST /parts/:partId/images - Upload image(s) for a part
export const uploadPartImages = async (req, res, next) => {
  try {
    const partId = asInt(req.params.partId);
    if (partId === null) throw badRequest('partId must be an integer');

    // Part already validated by setPartFolder middleware
    const part = req.partInfo;

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      throw badRequest('No files uploaded. Please upload at least one image.');
    }

    // Check if part already has a main image
    const existingMain = await prisma.partImage.findFirst({
      where: { partId, isMain: true }
    });

    // Create database records for uploaded images
    const images = await Promise.all(
      req.files.map(async (file, index) => {
        // First uploaded image becomes main if no main image exists
        const isMain = !existingMain && index === 0;
        
        return prisma.partImage.create({
          data: {
            partId,
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

// GET /parts/:partId/images - List all images for a part
export const listPartImages = async (req, res, next) => {
  try {
    const partId = asInt(req.params.partId);
    if (partId === null) throw badRequest('partId must be an integer');

    // Check if part exists
    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw notFound('Part not found');

    const images = await prisma.partImage.findMany({
      where: { partId },
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

// PUT /parts/:partId/images/:imageId/main - Set image as main
export const setMainImage = async (req, res, next) => {
  try {
    const partId = asInt(req.params.partId);
    const imageId = asInt(req.params.imageId);
    
    if (partId === null) throw badRequest('partId must be an integer');
    if (imageId === null) throw badRequest('imageId must be an integer');

    // Check if image exists and belongs to this part
    const image = await prisma.partImage.findUnique({ where: { id: imageId } });
    if (!image) throw notFound('Image not found');
    if (image.partId !== partId) throw badRequest('Image does not belong to this part');

    // Use transaction to ensure atomicity
    const [, updatedImage] = await prisma.$transaction([
      // Remove isMain from all images of this part
      prisma.partImage.updateMany({
        where: { partId },
        data: { isMain: false }
      }),
      // Set this image as main
      prisma.partImage.update({
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

// PUT /parts/:partId/images/reorder - Reorder part images
export const reorderImages = async (req, res, next) => {
  try {
    const partId = asInt(req.params.partId);
    if (partId === null) throw badRequest('partId must be an integer');

    const { imageIds } = req.body;

    // Validate imageIds
    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      throw badRequest('imageIds must be a non-empty array');
    }

    // Validate all IDs are integers
    const validIds = imageIds.every(id => Number.isInteger(id));
    if (!validIds) {
      throw badRequest('All imageIds must be integers');
    }

    // Check if part exists
    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw notFound('Part not found');

    // Fetch all images for this part
    const existingImages = await prisma.partImage.findMany({
      where: { partId }
    });

    // Verify all provided IDs belong to this part
    const existingIds = existingImages.map(img => img.id);
    const invalidIds = imageIds.filter(id => !existingIds.includes(id));
    
    if (invalidIds.length > 0) {
      throw badRequest(`Invalid image IDs: ${invalidIds.join(', ')}`);
    }

    // Update order for each image using transactions
    await prisma.$transaction(
      imageIds.map((id, index) => 
        prisma.partImage.update({
          where: { id },
          data: { order: index }
        })
      )
    );

    // Fetch updated images
    const updatedImages = await prisma.partImage.findMany({
      where: { partId },
      orderBy: [
        { isMain: 'desc' },
        { order: 'asc' }
      ]
    });

    res.json({
      message: 'Images reordered successfully',
      images: updatedImages
    });
  } catch (e) {
    next(e);
  }
};

// DELETE /parts/:partId/images/:imageId - Delete an image
export const deletePartImage = async (req, res, next) => {
  try {
    const partId = asInt(req.params.partId);
    const imageId = asInt(req.params.imageId);
    
    if (partId === null) throw badRequest('partId must be an integer');
    if (imageId === null) throw badRequest('imageId must be an integer');

    // Check if image exists and belongs to this part
    const image = await prisma.partImage.findUnique({ where: { id: imageId } });
    if (!image) throw notFound('Image not found');
    if (image.partId !== partId) throw badRequest('Image does not belong to this part');

    // If deleting main image, set another image as main
    if (image.isMain) {
      const otherImage = await prisma.partImage.findFirst({
        where: { 
          partId,
          id: { not: imageId }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (otherImage) {
        await prisma.partImage.update({
          where: { id: otherImage.id },
          data: { isMain: true }
        });
      }
    }

    // Delete from database
    await prisma.partImage.delete({ where: { id: imageId } });

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
