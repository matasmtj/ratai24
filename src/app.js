/**
 * Express application factory.
 *
 * Extracted from index.js so that integration tests (Supertest) can import
 * a fully-wired app without starting a server. Production uses this same
 * factory via index.js, which adds `app.listen`.
 */
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import fs from 'fs';
import path from 'path';

import { errorHandler } from './errors.js';

import authRoutes from './routes/auth.routes.js';
import cityRoutes from './routes/cities.routes.js';
import carRoutes from './routes/cars.routes.js';
import contractRoutes from './routes/contracts.routes.js';
import debugRoutes from './routes/debug.routes.js';
import carImageRoutes from './routes/car-images.routes.js';
import userRoutes from './routes/users.routes.js';
import contactRoutes from './routes/contacts.routes.js';
import pricingRoutes from './pricing/pricing.routes.js';
import adminPricingRoutes from './pricing/admin.pricing.routes.js';

export function createApp({ enableSwagger = true, enableMorgan = true } = {}) {
  const app = express();
  app.use(cors());
  if (enableMorgan) app.use(morgan('dev'));
  // JSON for all routes. Multipart image uploads are Content-Type: multipart/form-data, so
  // express.json() leaves the body for multer (do not use express.json for those requests).
  app.use(express.json());

  // Ensure uploads directory exists (needed on Render).
  const uploadsDir = path.resolve('uploads');
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch (e) {
    console.error('Failed to ensure uploads directory:', e);
  }
  app.use('/uploads', express.static('uploads'));

  // Car image routes: POST uses multer; PUT/GET/DELETE use JSON or no body.
  app.use(carImageRoutes);

  app.use(authRoutes);
  app.use(cityRoutes);
  app.use(carRoutes);
  app.use(contractRoutes);
  app.use(userRoutes);
  app.use(contactRoutes);
  app.use(pricingRoutes);
  app.use(adminPricingRoutes);
  app.use('/debug', debugRoutes);

  if (enableSwagger) {
    try {
      const swaggerDocument = YAML.load('./openapi.yaml');
      app.use('/', swaggerUi.serve);
      app.get('/', swaggerUi.setup(swaggerDocument));
    } catch (e) {
      console.error('Failed to load Swagger document:', e);
    }
  }

  app.get('/health', (req, res) => res.json({ ok: true }));

  app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

  app.use(errorHandler);

  return app;
}
