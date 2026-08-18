import { INestApplication } from '@nestjs/common';
import { createTestApp } from './utils/create-test-app';
import { resetDatabase } from './utils/db';
import {
  createGateUser,
  createMovie,
  createOrganizer,
  createScreening,
  createSeats,
  loginAs,
  prismaOf,
  registerClient,
} from './utils/fixtures';

describe('Gate validation (e2e)', () => {
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

  async function purchaseTicket(buyerName = 'Comprador Teste') {
    const organizer = await createOrganizer(app);
    const movie = await createMovie(app, organizer.id, {
      title: 'Filme da Portaria',
    });
    const screening = await createScreening(app, movie.id, { venue: 'Sala 7' });
    const seats = await createSeats(app, screening.id, ['A'], 1);

    const { agent } = await registerClient(app, { name: buyerName });
    await agent.post(`/api/seats/${seats[0].id}/hold`).expect(201);
    const orderRes = await agent
      .post('/api/orders')
      .send({ screeningId: screening.id, seatIds: [seats[0].id] });
    const payRes = await agent
      .post(`/api/orders/${orderRes.body.data.id}/pay`)
      .send({ paymentMethod: 'pix' });

    const ticket = payRes.body.data.tickets[0];
    return { shortCode: ticket.shortCode as string, screening, movie };
  }

  async function gateAgent() {
    const gateUser = await createGateUser(app);
    const { agent } = await loginAs(app, gateUser.email!);
    return agent;
  }

  it('valida um código correto: resultado "valid" com dados da reserva e nome do comprador', async () => {
    const { shortCode, screening, movie } =
      await purchaseTicket('Ana Compradora');
    const agent = await gateAgent();

    const res = await agent
      .post('/api/gate/validate')
      .send({ code: shortCode });

    expect(res.status).toBe(201);
    expect(res.body.data.result).toBe('valid');
    expect(res.body.data.ticket).toMatchObject({
      buyerName: 'Ana Compradora',
      status: 'used',
      screening: {
        movieTitle: movie.title,
        venue: screening.venue,
      },
    });
  });

  it('a segunda validação do mesmo código retorna "already_used"', async () => {
    const { shortCode } = await purchaseTicket();
    const agent = await gateAgent();

    await agent
      .post('/api/gate/validate')
      .send({ code: shortCode })
      .expect(201);
    const res = await agent
      .post('/api/gate/validate')
      .send({ code: shortCode });

    expect(res.body.data.result).toBe('already_used');
  });

  it('código inexistente (mas com formato válido) retorna "invalid"', async () => {
    const agent = await gateAgent();
    const res = await agent
      .post('/api/gate/validate')
      .send({ code: 'ZZZ-ZZZ' });

    expect(res.status).toBe(201);
    expect(res.body.data.result).toBe('invalid');
    expect(res.body.data.ticket).toBeUndefined();
  });

  it('código inexistente fora do formato XXX-XXX (mas com caracteres válidos, ex.: token) retorna "invalid", não 400', async () => {
    const agent = await gateAgent();
    const res = await agent
      .post('/api/gate/validate')
      .send({ code: 'not-a-real-token' });
    expect(res.status).toBe(201);
    expect(res.body.data.result).toBe('invalid');
  });

  it('código com caracteres fora do permitido (espaço) é rejeitado com 400 antes de tocar o banco', async () => {
    const agent = await gateAgent();
    const res = await agent
      .post('/api/gate/validate')
      .send({ code: 'has spaces' });
    expect(res.status).toBe(400);
  });

  it('valida pelo token do QR code, não só pelo código curto digitado', async () => {
    const organizer = await createOrganizer(app);
    const movie = await createMovie(app, organizer.id);
    const screening = await createScreening(app, movie.id);
    const seats = await createSeats(app, screening.id, ['A'], 1);
    const { agent } = await registerClient(app, { name: 'Comprador QR' });
    await agent.post(`/api/seats/${seats[0].id}/hold`).expect(201);
    const orderRes = await agent
      .post('/api/orders')
      .send({ screeningId: screening.id, seatIds: [seats[0].id] });
    const payRes = await agent
      .post(`/api/orders/${orderRes.body.data.id}/pay`)
      .send({ paymentMethod: 'pix' });
    const token = payRes.body.data.tickets[0].token as string;

    const gate = await gateAgent();
    const res = await gate.post('/api/gate/validate').send({ code: token });

    expect(res.status).toBe(201);
    expect(res.body.data.result).toBe('valid');
    expect(res.body.data.ticket).toMatchObject({ buyerName: 'Comprador QR' });
  });

  it('ingresso de sessão cancelada retorna "cancelled", distinto de "already_used"', async () => {
    const organizer = await createOrganizer(app);
    const movie = await createMovie(app, organizer.id);
    const screening = await createScreening(app, movie.id);
    const seats = await createSeats(app, screening.id, ['A'], 1);
    const { agent: client } = await registerClient(app);
    await client.post(`/api/seats/${seats[0].id}/hold`).expect(201);
    const orderRes = await client
      .post('/api/orders')
      .send({ screeningId: screening.id, seatIds: [seats[0].id] });
    const payRes = await client
      .post(`/api/orders/${orderRes.body.data.id}/pay`)
      .send({ paymentMethod: 'pix' });
    const shortCode = payRes.body.data.tickets[0].shortCode as string;

    const { agent: organizerAgent } = await loginAs(app, organizer.email!);
    await organizerAgent
      .post(`/api/organizer/screenings/${screening.id}/cancel`)
      .expect(201);

    const gate = await gateAgent();
    const res = await gate.post('/api/gate/validate').send({ code: shortCode });
    expect(res.body.data.result).toBe('cancelled');
  });

  it('comprador sem nome cadastrado aparece com o texto de fallback, não vazio/undefined', async () => {
    const organizer = await createOrganizer(app);
    const movie = await createMovie(app, organizer.id);
    const screening = await createScreening(app, movie.id);
    const seats = await createSeats(app, screening.id, ['A'], 1);
    const { agent, user } = await registerClient(app);
    await prismaOf(app).user.update({
      where: { id: user.id },
      data: { name: null },
    });

    await agent.post(`/api/seats/${seats[0].id}/hold`).expect(201);
    const orderRes = await agent
      .post('/api/orders')
      .send({ screeningId: screening.id, seatIds: [seats[0].id] });
    const payRes = await agent
      .post(`/api/orders/${orderRes.body.data.id}/pay`)
      .send({ paymentMethod: 'pix' });
    const shortCode = payRes.body.data.tickets[0].shortCode as string;

    const gate = await gateAgent();
    const res = await gate.post('/api/gate/validate').send({ code: shortCode });
    expect(res.body.data.ticket.buyerName).toBe(
      'Comprador sem nome cadastrado',
    );
  });
});
