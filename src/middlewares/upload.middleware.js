import multer from 'multer';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { config } from '../config.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

// Configure Cloudinary storage with dynamic folder
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Use custom folder if provided in req, otherwise default
    const folder = req.cloudinaryFolder || 'car-lease-images';
    
    return {
      folder: folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [{ width: 1200, height: 900, crop: 'limit' }]
    };
  }
});

// Hero background images are rendered full-width on the landing page, so the
// stricter 1200x900 limit used for car/part photos is too small. This storage
// caps at 2400x1200 (limit = keeps aspect ratio, only shrinks oversize input).
const heroStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async () => ({
    folder: 'site-settings/hero',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 2400, height: 1200, crop: 'limit', quality: 'auto:good' }],
  }),
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  }
});

// Hero image uploader: same file filter, slightly larger size budget.
export const uploadHero = multer({
  storage: heroStorage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB max - hero images can be wider
  },
});

export { cloudinary };
