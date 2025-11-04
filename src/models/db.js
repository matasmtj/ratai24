import { PrismaClient } from '@prisma/client';

// Prisma client singleton to be shared across the app
const prisma = new PrismaClient();

export default prisma;
