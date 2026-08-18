const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

(async () => {
  const count = await prisma.movie.count();
  await prisma.$disconnect();

  if (count > 0) {
    console.log(`[seed] ${count} filme(s) já no banco — pulando seed.`);
    return;
  }

  console.log('[seed] banco vazio — rodando seed inicial...');
  execSync('npx prisma db seed', { stdio: 'inherit' });
})().catch((err) => {
  console.error('[seed] falha ao checar/rodar seed (app segue subindo mesmo assim):', err.message);
});
