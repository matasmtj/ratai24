import prisma from '../models/db.js';
import { badRequest, notFound } from '../errors.js';
import { cloudinary } from '../middlewares/upload.middleware.js';

const asInt = (v) => { const n = Number(v); return Number.isInteger(n) ? n : null; };

export const uploadPartImages = async (req, res, next) => {
  try {
    const partId = asInt(req.params.partId);
    if (partId === null) throw badRequest('partId must be an integer');

    if (!req.files || req.files.length === 0) {
      throw badRequest('No files uploaded. Please upload at least one image.');
    }

    const existingMain = await prisma.partImage.findFirst({
      where: { partId, isMain: true },
    });

    const images = await Promise.all(
      req.files.map(async (file, index) => {
        const isMain = !existingMain && index === 0;
        return prisma.partImage.create({
          data: {
            partId,
            filename: file.filename,
            url: file.path,
            isMain,
          },
        });
      })
    );

    res.status(201).json({
      message: `${images.length} image(s) uploaded successfully`,
      images,
    });
  } catch (e) {
    next(e);
  }
};

export const listPartImages = async (req, res, next) => {
  try {
    const partId = asInt(req.params.partId);
    if (partId === null) throw badRequest('partId must be an integer');

    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw notFound('Part not found');

    const images = await prisma.partImage.findMany({
      where: { partId },
      orderBy: [{ isMain: 'desc' }, { order: 'asc' }, { createdAt: 'asc' }],
    });

    res.json({ images });
  } catch (e) {
    next(e);
  }
};

export const setMainPartImage = async (req, res, next) => {
  try {
    const partId = asInt(req.params.partId);
    const imageId = asInt(req.params.imageId);
    if (partId === null) throw badRequest('partId must be an integer');
    if (imageId === null) throw badRequest('imageId must be an integer');

    const image = await prisma.partImage.findUnique({ where: { id: imageId } });
    if (!image) throw notFound('Image not found');
    if (image.partId !== partId) throw badRequest('Image does not belong to this part');

    const [, updatedImage] = await prisma.$transaction([
      prisma.partImage.updateMany({ where: { partId }, data: { isMain: false } }),
      prisma.partImage.update({ where: { id: imageId }, data: { isMain: true } }),
    ]);

    res.json({ message: 'Main image updated successfully', image: updatedImage });
  } catch (e) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Image not found' });
    next(e);
  }
};

export const reorderPartImages = async (req, res, next) => {
  try {
    const partId = asInt(req.params.partId);
    if (partId === null) throw badRequest('partId must be an integer');

    const imageIds = req.body?.imageIds;
    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      throw badRequest('imageIds must be a non-empty array');
    }

    const normalizedIds = imageIds.map((id) => {
      const n = Number(id);
      return Number.isInteger(n) ? n : NaN;
    });
    if (normalizedIds.some((id) => Number.isNaN(id))) {
      throw badRequest('All imageIds must be integers');
    }

    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw notFound('Part not found');

    const existingImages = await prisma.partImage.findMany({ where: { partId } });
    const existingIds = existingImages.map((img) => img.id);
    const invalidIds = normalizedIds.filter((id) => !existingIds.includes(id));
    if (invalidIds.length > 0) {
      throw badRequest(`Invalid image IDs: ${invalidIds.join(', ')}`);
    }

    await prisma.$transaction(
      normalizedIds.map((id, index) =>
        prisma.partImage.update({ where: { id }, data: { order: index } })
      )
    );

    const updatedImages = await prisma.partImage.findMany({
      where: { partId },
      orderBy: [{ isMain: 'desc' }, { order: 'asc' }],
    });

    res.json({ message: 'Images reordered successfully', images: updatedImages });
  } catch (e) {
    next(e);
  }
};

export const deletePartImage = async (req, res, next) => {
  try {
    const partId = asInt(req.params.partId);
    const imageId = asInt(req.params.imageId);
    if (partId === null) throw badRequest('partId must be an integer');
    if (imageId === null) throw badRequest('imageId must be an integer');

    const image = await prisma.partImage.findUnique({ where: { id: imageId } });
    if (!image) throw notFound('Image not found');
    if (image.partId !== partId) throw badRequest('Image does not belong to this part');

    if (image.isMain) {
      const otherImage = await prisma.partImage.findFirst({
        where: { partId, id: { not: imageId } },
        orderBy: { createdAt: 'asc' },
      });
      if (otherImage) {
        await prisma.partImage.update({ where: { id: otherImage.id }, data: { isMain: true } });
      }
    }

    await prisma.partImage.delete({ where: { id: imageId } });

    try {
      const urlParts = image.url.split('/');
      const uploadIndex = urlParts.findIndex((part) => part === 'upload');
      if (uploadIndex !== -1) {
        const pathParts = urlParts.slice(uploadIndex + 2);
        const fileWithExt = pathParts.join('/');
        const publicId = fileWithExt.substring(0, fileWithExt.lastIndexOf('.'));
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (unlinkErr) {
      console.error('Error deleting file from Cloudinary:', unlinkErr);
    }

    res.json({ message: 'Image deleted successfully', image });
  } catch (e) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Image not found' });
    next(e);
  }
};
