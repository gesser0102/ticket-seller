import { PrismaService } from '../../src/prisma/prisma.service';

const TABLES = [
  'tickets',
  'payments',
  'seats',
  'orders',
  'screenings',
  'movies',
  'rooms',
  'users',
  'session',
];

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;`,
  );
}
