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
import userRoutes from './src/routes/users.routes.js';

const app = express();
app.use(cors());
app.use(express.json());
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

// Routes
app.use(authRoutes);
app.use(cityRoutes);
app.use(carRoutes);
app.use(contractRoutes);
app.use(carImageRoutes);
app.use(userRoutes);
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
