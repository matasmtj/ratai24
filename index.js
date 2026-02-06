import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import fs from 'fs';
import path from 'path';

import { config } from './src/config.js';
import { errorHandler } from './src/errors.js';

import authRoutes from './src/routes/auth.routes.js';
import cityRoutes from './src/routes/cities.routes.js';
import carRoutes from './src/routes/cars.routes.js';
import contractRoutes from './src/routes/contracts.routes.js';
import debugRoutes from './src/routes/debug.routes.js';
import carImageRoutes from './src/routes/car-images.routes.js';
import partImageRoutes from './src/routes/part-images.routes.js';
import userRoutes from './src/routes/users.routes.js';
import contactRoutes from './src/routes/contacts.routes.js';
import partsRoutes from './src/parts/parts.routes.js';
import pricingRoutes from './src/pricing/pricing.routes.js';
import adminPricingRoutes from './src/pricing/admin.pricing.routes.js';

const app = express();
app.use(cors());
// DON'T use express.json() globally - it interferes with multer multipart parsing
// app.use(express.json());
app.use(morgan('dev'));

// Ensure uploads directory exists (needed on Render)
const uploadsDir = path.resolve('uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  console.error('Failed to ensure uploads directory:', e);
}

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Routes - image routes MUST come before JSON parsing
app.use(carImageRoutes); // Must be first - handles multipart/form-data
app.use(partImageRoutes); // Must be first - handles multipart/form-data

// Now apply JSON parsing for other routes
app.use(express.json());

app.use(authRoutes);
app.use(cityRoutes);
app.use(carRoutes);
app.use(contractRoutes);
app.use(userRoutes);
app.use(contactRoutes);
app.use(partsRoutes);
app.use(pricingRoutes);
app.use(adminPricingRoutes);
app.use('/debug', debugRoutes);

// Swagger (OpenAPI YAML)
const swaggerDocument = YAML.load('./openapi.yaml');
app.use('/', swaggerUi.serve);
app.get('/', swaggerUi.setup(swaggerDocument));;

// Health
app.get('/health', (req, res) => res.json({ ok: true }));



// 404 for unknown routes
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// Errors
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`API http://localhost:${config.port}`);
  //console.log(`Docs http://localhost:${config.port}/api-docs`);
});
