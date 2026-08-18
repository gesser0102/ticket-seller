import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/create-test-app';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health responde ok dentro do envelope padrão', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    expect(res.body).toEqual({
      success: true,
      message: 'OK',
      data: { status: 'ok' },
    });
  });

  it('rota inexistente responde 404 dentro do mesmo envelope, sem vazar stack', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/rota-que-nao-existe')
      .expect(404);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeNull();
    expect(res.body.message).not.toMatch(/at\s+.*\(.*:\d+:\d+\)/);
  });
});
