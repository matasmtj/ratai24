import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/roles.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { setPartFolder } from '../middlewares/part-folder.middleware.js';
import { 
  uploadPartImages, 
  listPartImages, 
  setMainImage,
  reorderImages,
  deletePartImage 
} from '../controllers/part-images.controller.js';

const r = Router();

// Upload images (ADMIN only, multiple files)
r.post('/parts/:partId/images', requireAuth, requireRole('ADMIN'), setPartFolder, upload.array('images', 10), uploadPartImages);

// List images (public)
r.get('/parts/:partId/images', listPartImages);

// Set main image (ADMIN only)
r.put('/parts/:partId/images/:imageId/main', requireAuth, requireRole('ADMIN'), setMainImage);

// Reorder images (ADMIN only)
r.put('/parts/:partId/images/reorder', requireAuth, requireRole('ADMIN'), reorderImages);

// Delete image (ADMIN only)
r.delete('/parts/:partId/images/:imageId', requireAuth, requireRole('ADMIN'), deletePartImage);

export default r;
