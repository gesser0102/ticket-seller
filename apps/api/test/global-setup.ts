import { config } from 'dotenv';
import { resolve } from 'path';
import { execSync } from 'child_process';

export default function globalSetup(): void {
  config({ path: resolve(__dirname, '../.env') });

  if (!process.env.DATABASE_URL_TEST) {
    throw new Error(
      'DATABASE_URL_TEST não configurada. Veja .env.example e suba o serviço "postgres_test" do docker-compose.',
    );
  }

  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST },
    stdio: 'inherit',
  });
}
