// src/routes/debug.routes.js
import { Router } from 'express';
import { prisma } from '../models/db.js';

const router = Router();

router.get('/db', async (_req, res) => {
  try {
    const [info] = await prisma.$queryRawUnsafe(`
      SELECT
        current_database() AS db,
        current_user       AS "user",
        current_schema()   AS schema,
        inet_server_addr() AS host,
        inet_server_port() AS port,
        version()          AS ver
    `);

    const url = process.env.DATABASE_URL || '';
    const redacted = url.replace(/:\/\/.*@/, '://<redacted>@');

    res.json({ envDatabaseUrl: redacted, runtime: info });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'unknown error' });
  }
});

export default router;
