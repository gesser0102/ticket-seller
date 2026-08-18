import { INestApplication } from '@nestjs/common';
import { createTestApp } from './utils/create-test-app';
import { resetDatabase } from './utils/db';
import {
  createMovie,
  createOrganizer,
  createScreening,
  createSeats,
  prismaOf,
  registerClient,
} from './utils/fixtures';

describe('Seats (e2e)', () => {
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

  async function makeScreeningWithSeats(
    status: 'draft' | 'published' | 'cancelled' = 'published',
  ) {
    const organizer = await createOrganizer(app);
    const movie = await createMovie(app, organizer.id);
    const screening = await createScreening(app, movie.id, { status });
    const seats = await createSeats(app, screening.id, ['A'], 4);
    return { organizer, movie, screening, seats };
  }

  it('segura um assento disponível (heldByMe true na resposta)', async () => {
    const { seats } = await makeScreeningWithSeats();
    const { agent } = await registerClient(app);

    const res = await agent.post(`/api/seats/${seats[0].id}/hold`);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      id: seats[0].id,
      status: 'held',
      heldByMe: true,
    });
  });

  it('recusa segurar um assento já reservado por outro cliente (409)', async () => {
    const { seats } = await makeScreeningWithSeats();
    const { agent: agentA } = await registerClient(app);
    const { agent: agentB } = await registerClient(app);

    await agentA.post(`/api/seats/${seats[0].id}/hold`).expect(201);
    const res = await agentB.post(`/api/seats/${seats[0].id}/hold`);
    expect(res.status).toBe(409);
  });

  it('permite segurar um assento cujo hold já expirou', async () => {
    const { seats } = await makeScreeningWithSeats();
    const prisma = prismaOf(app);
    await prisma.seat.update({
      where: { id: seats[0].id },
      data: {
        status: 'held',
        heldBy: (await createOrganizer(app)).id,
        holdExpires: new Date(Date.now() - 60_000),
      },
    });

    const { agent } = await registerClient(app);
    const res = await agent.post(`/api/seats/${seats[0].id}/hold`);
    expect(res.status).toBe(201);
    expect(res.body.data.heldByMe).toBe(true);
  });

  it('404 ao tentar segurar assento de sessão não publicada (draft)', async () => {
    const { seats } = await makeScreeningWithSeats('draft');
    const { agent } = await registerClient(app);
    await agent.post(`/api/seats/${seats[0].id}/hold`).expect(404);
  });

  it('404 ao tentar segurar assento inexistente', async () => {
    const { agent } = await registerClient(app);
    await agent
      .post('/api/seats/00000000-0000-0000-0000-000000000000/hold')
      .expect(404);
  });

  it('libera um assento que o próprio cliente segurou', async () => {
    const { seats } = await makeScreeningWithSeats();
    const { agent } = await registerClient(app);
    await agent.post(`/api/seats/${seats[0].id}/hold`).expect(201);

    const res = await agent.delete(`/api/seats/${seats[0].id}/hold`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('available');
  });

  it('recusa liberar um assento segurado por outro cliente (409)', async () => {
    const { seats } = await makeScreeningWithSeats();
    const { agent: agentA } = await registerClient(app);
    const { agent: agentB } = await registerClient(app);
    await agentA.post(`/api/seats/${seats[0].id}/hold`).expect(201);

    const res = await agentB.delete(`/api/seats/${seats[0].id}/hold`);
    expect(res.status).toBe(409);
  });

  it('a listagem de assentos reflete held/heldByMe corretamente por observador', async () => {
    const { seats, screening } = await makeScreeningWithSeats();
    const { agent: owner } = await registerClient(app);
    const { agent: observer } = await registerClient(app);
    await owner.post(`/api/seats/${seats[0].id}/hold`).expect(201);

    const ownerView = await owner
      .get(`/api/screenings/${screening.id}/seats`)
      .expect(200);
    const observerView = await observer
      .get(`/api/screenings/${screening.id}/seats`)
      .expect(200);

    const ownerSeat = ownerView.body.data.find(
      (s: { id: string }) => s.id === seats[0].id,
    );
    const observerSeat = observerView.body.data.find(
      (s: { id: string }) => s.id === seats[0].id,
    );

    expect(ownerSeat).toMatchObject({ status: 'held', heldByMe: true });
    expect(observerSeat).toMatchObject({ status: 'held', heldByMe: false });
  });

  it('concorrência: duas tentativas simultâneas no mesmo assento — exatamente uma vence', async () => {
    const { seats } = await makeScreeningWithSeats();
    const { agent: agentA } = await registerClient(app);
    const { agent: agentB } = await registerClient(app);

    const [resA, resB] = await Promise.all([
      agentA.post(`/api/seats/${seats[0].id}/hold`),
      agentB.post(`/api/seats/${seats[0].id}/hold`),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const prisma = prismaOf(app);
    const seatInDb = await prisma.seat.findUniqueOrThrow({
      where: { id: seats[0].id },
    });
    expect(seatInDb.status).toBe('held');
  });
});
