import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

if (!process.env.DATABASE_URL_TEST) {
  throw new Error(
    'DATABASE_URL_TEST não configurada. Veja .env.example e suba o serviço "postgres_test" do docker-compose.',
  );
}

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.SESSION_SECRET = 'test-secret';
process.env.COOKIE_SECURE = 'false';
