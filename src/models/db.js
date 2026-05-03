import { PrismaClient } from '@prisma/client';

// Single shared client — avoid `new PrismaClient()` elsewhere; each instance opens its own pool
// and can exhaust DB max connections (e.g. Render Postgres session pooler limits).
// Optional: append `?connection_limit=N` to DATABASE_URL on small tiers.

// Prisma client singleton to be shared across the app
const globalForPrisma = globalThis;
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
