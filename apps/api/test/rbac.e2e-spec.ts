import { INestApplication } from '@nestjs/common';
import { createTestApp } from './utils/create-test-app';
import { resetDatabase } from './utils/db';
import {
  anonymousAgent,
  createGateUser,
  createMovie,
  createOrganizer,
  createScreening,
  createSeats,
  loginAs,
  prismaOf,
  registerClient,
} from './utils/fixtures';

describe('RBAC entre papéis (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prismaOf(app));
  });

  async function makeScreening() {
    const organizer = await createOrganizer(app);
    const movie = await createMovie(app, organizer.id);
    const screening = await createScreening(app, movie.id);
    const seats = await createSeats(app, screening.id, ['A'], 1);
    return { organizer, movie, screening, seats };
  }

  describe('organizador e portaria não compram ingresso', () => {
    it('organizador recebe 403 ao tentar segurar assento', async () => {
      const { seats } = await makeScreening();
      const organizer = await createOrganizer(app);
      const { agent } = await loginAs(app, organizer.email!);

      const res = await agent.post(`/api/seats/${seats[0].id}/hold`);
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/exclusiva de clientes/i);
    });

    it('portaria recebe 403 ao tentar segurar assento', async () => {
      const { seats } = await makeScreening();
      const gateUser = await createGateUser(app);
      const { agent } = await loginAs(app, gateUser.email!);

      const res = await agent.post(`/api/seats/${seats[0].id}/hold`);
      expect(res.status).toBe(403);
    });

    it('organizador recebe 403 em GET /tickets/mine (RegisteredGuard exige cliente)', async () => {
      const organizer = await createOrganizer(app);
      const { agent } = await loginAs(app, organizer.email!);
      await agent.get('/api/tickets/mine').expect(403);
    });

    it('portaria recebe 403 em GET /tickets/mine', async () => {
      const gateUser = await createGateUser(app);
      const { agent } = await loginAs(app, gateUser.email!);
      await agent.get('/api/tickets/mine').expect(403);
    });

    it('cliente comum consegue segurar assento normalmente (regra não quebrou o fluxo legítimo)', async () => {
      const { seats } = await makeScreening();
      const { agent } = await registerClient(app);
      await agent.post(`/api/seats/${seats[0].id}/hold`).expect(201);
    });
  });

  describe('painel do organizador é exclusivo do papel organizer', () => {
    it('cliente recebe 403 em qualquer rota /organizer', async () => {
      const { agent } = await registerClient(app);
      await agent.get('/api/organizer/overview').expect(403);
    });

    it('portaria recebe 403 em /organizer', async () => {
      const gateUser = await createGateUser(app);
      const { agent } = await loginAs(app, gateUser.email!);
      await agent.get('/api/organizer/overview').expect(403);
    });

    it('sem sessão nenhuma recebe 401 (não 403) em /organizer', async () => {
      const res = await anonymousAgent(app).get('/api/organizer/overview');
      expect(res.status).toBe(401);
    });

    it('um organizador não consegue cancelar a sessão de outro organizador (403)', async () => {
      const { screening } = await makeScreening();
      const otherOrganizer = await createOrganizer(app);
      const { agent } = await loginAs(app, otherOrganizer.email!);

      const res = await agent.post(
        `/api/organizer/screenings/${screening.id}/cancel`,
      );
      expect(res.status).toBe(403);
    });
  });

  describe('portaria é exclusiva do papel gate', () => {
    it('cliente recebe 403 em /gate/validate', async () => {
      const { agent } = await registerClient(app);
      const res = await agent
        .post('/api/gate/validate')
        .send({ code: 'ABC-DEF' });
      expect(res.status).toBe(403);
    });

    it('organizador recebe 403 em /gate/validate', async () => {
      const organizer = await createOrganizer(app);
      const { agent } = await loginAs(app, organizer.email!);
      const res = await agent
        .post('/api/gate/validate')
        .send({ code: 'ABC-DEF' });
      expect(res.status).toBe(403);
    });

    it('sem sessão nenhuma recebe 401 em /gate/validate', async () => {
      const res = await anonymousAgent(app)
        .post('/api/gate/validate')
        .send({ code: 'ABC-DEF' });
      expect(res.status).toBe(401);
    });
  });

  describe('pagamento exige sessão registrada, não só logada', () => {
    it('sem sessão nenhuma recebe 401 (não 403) ao tentar pagar', async () => {
      const res = await anonymousAgent(app)
        .post('/api/orders/00000000-0000-0000-0000-000000000000/pay')
        .send({ paymentMethod: 'pix' });
      expect(res.status).toBe(401);
    });
  });
});
