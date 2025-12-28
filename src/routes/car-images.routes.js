import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { setCarFolder } from '../middlewares/car-folder.middleware.js';
import { 
  uploadCarImages, 
  listCarImages, 
  setMainImage, 
  deleteCarImage 
} from '../controllers/car-images.controller.js';

const r = Router();

// Upload images (ADMIN only, multiple files)
r.post('/cars/:carId/images', requireAuth, requireRole('ADMIN'), setCarFolder, upload.array('images', 10), uploadCarImages);

// List images (public)
r.get('/cars/:carId/images', listCarImages);

// Set main image (ADMIN only)
r.put('/cars/:carId/images/:imageId/main', requireAuth, requireRole('ADMIN'), setMainImage);

// Delete image (ADMIN only)
r.delete('/cars/:carId/images/:imageId', requireAuth, requireRole('ADMIN'), deleteCarImage);

export default r;
