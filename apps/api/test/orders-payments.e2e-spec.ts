import { INestApplication } from '@nestjs/common';
import { createTestApp } from './utils/create-test-app';
import { resetDatabase } from './utils/db';
import {
  anonymousAgent,
  createMovie,
  createOrganizer,
  createScreening,
  createSeats,
  prismaOf,
  registerClient,
  TestAgent,
} from './utils/fixtures';
import { SHORT_CODE_PATTERN } from '../src/common/utils/short-code.util';

const MAGIC_DECLINE_CARD = '4000000000000002';

describe('Orders & Payments (e2e)', () => {
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

  async function makeScreening(priceCents = 4500) {
    const organizer = await createOrganizer(app);
    const movie = await createMovie(app, organizer.id);
    const screening = await createScreening(app, movie.id, { priceCents });
    const seats = await createSeats(app, screening.id, ['A'], 4);
    return { organizer, movie, screening, seats };
  }

  async function holdSeats(agent: TestAgent, seatIds: string[]) {
    for (const seatId of seatIds) {
      await agent.post(`/api/seats/${seatId}/hold`).expect(201);
    }
  }

  describe('POST /api/orders', () => {
    it('cria a reserva com o total calculado no servidor (preço × assentos)', async () => {
      const { screening, seats } = await makeScreening(5000);
      const { agent } = await registerClient(app);
      await holdSeats(agent, [seats[0].id, seats[1].id]);

      const res = await agent.post('/api/orders').send({
        screeningId: screening.id,
        seatIds: [seats[0].id, seats[1].id],
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        screeningId: screening.id,
        status: 'hold',
        totalCents: 10000,
      });
    });

    it('rejeita (whitelist) qualquer campo de total enviado pelo cliente — nunca é aceito do payload', async () => {
      const { screening, seats } = await makeScreening(5000);
      const { agent } = await registerClient(app);
      await holdSeats(agent, [seats[0].id]);

      const res = await agent.post('/api/orders').send({
        screeningId: screening.id,
        seatIds: [seats[0].id],
        totalCents: 1,
      });

      expect(res.status).toBe(400);

      const legit = await agent
        .post('/api/orders')
        .send({ screeningId: screening.id, seatIds: [seats[0].id] });
      expect(legit.status).toBe(201);
      expect(legit.body.data.totalCents).toBe(5000);
    });

    it('409 ao tentar criar reserva com assento que não está held pelo próprio cliente', async () => {
      const { screening, seats } = await makeScreening();
      const { agent } = await registerClient(app);

      const res = await agent
        .post('/api/orders')
        .send({ screeningId: screening.id, seatIds: [seats[0].id] });
      expect(res.status).toBe(409);
    });

    it('funciona também para um cliente anônimo (ainda não cadastrado)', async () => {
      const { screening, seats } = await makeScreening();
      const agent = anonymousAgent(app);
      await holdSeats(agent, [seats[0].id]);

      const res = await agent
        .post('/api/orders')
        .send({ screeningId: screening.id, seatIds: [seats[0].id] });
      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('retorna 403 ao tentar ver a reserva de outro cliente', async () => {
      const { screening, seats } = await makeScreening();
      const { agent: owner } = await registerClient(app);
      await holdSeats(owner, [seats[0].id]);
      const orderRes = await owner
        .post('/api/orders')
        .send({ screeningId: screening.id, seatIds: [seats[0].id] });

      const { agent: stranger } = await registerClient(app);
      const res = await stranger.get(`/api/orders/${orderRes.body.data.id}`);
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/orders/:id/ticket-types', () => {
    it('recalcula o total misturando inteira/meia (meia = metade, arredondado)', async () => {
      const { screening, seats } = await makeScreening(4501);
      const { agent } = await registerClient(app);
      await holdSeats(agent, [seats[0].id, seats[1].id]);
      const orderRes = await agent.post('/api/orders').send({
        screeningId: screening.id,
        seatIds: [seats[0].id, seats[1].id],
      });
      const orderId = orderRes.body.data.id;

      const res = await agent
        .patch(`/api/orders/${orderId}/ticket-types`)
        .send({
          items: [
            { seatId: seats[0].id, type: 'inteira' },
            { seatId: seats[1].id, type: 'meia' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.totalCents).toBe(6752);
    });

    it('409 ao referenciar um assento que não pertence à reserva', async () => {
      const { screening, seats } = await makeScreening();
      const { agent } = await registerClient(app);
      await holdSeats(agent, [seats[0].id]);
      const orderRes = await agent
        .post('/api/orders')
        .send({ screeningId: screening.id, seatIds: [seats[0].id] });

      const res = await agent
        .patch(`/api/orders/${orderRes.body.data.id}/ticket-types`)
        .send({
          items: [{ seatId: seats[2].id, type: 'meia' }],
        });
      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/orders/:id/pay', () => {
    async function createHeldOrder(priceCents = 4500) {
      const { screening, seats } = await makeScreening(priceCents);
      const { agent } = await registerClient(app);
      await holdSeats(agent, [seats[0].id]);
      const orderRes = await agent
        .post('/api/orders')
        .send({ screeningId: screening.id, seatIds: [seats[0].id] });
      return {
        agent,
        orderId: orderRes.body.data.id as string,
        seatId: seats[0].id,
        screening,
      };
    }

    it('Pix sempre aprova e emite ingresso com token/shortCode no formato certo', async () => {
      const { agent, orderId, seatId } = await createHeldOrder();

      const res = await agent
        .post(`/api/orders/${orderId}/pay`)
        .send({ paymentMethod: 'pix' });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('approved');
      expect(res.body.data.order.status).toBe('paid');
      const [ticket] = res.body.data.tickets;
      expect(ticket.token).toHaveLength(43);
      expect(ticket.shortCode).toMatch(SHORT_CODE_PATTERN);
      expect(ticket.status).toBe('valid');

      const prisma = prismaOf(app);
      const seatInDb = await prisma.seat.findUniqueOrThrow({
        where: { id: seatId },
      });
      expect(seatInDb.status).toBe('sold');
    });

    it('Cartão com o número mágico é recusado e libera o assento de volta', async () => {
      const { agent, orderId, seatId } = await createHeldOrder();

      const res = await agent
        .post(`/api/orders/${orderId}/pay`)
        .send({ paymentMethod: 'card', cardNumber: MAGIC_DECLINE_CARD });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('declined');
      expect(res.body.data.order.status).toBe('cancelled');
      expect(res.body.data.tickets).toBeUndefined();

      const prisma = prismaOf(app);
      const seatInDb = await prisma.seat.findUniqueOrThrow({
        where: { id: seatId },
      });
      expect(seatInDb.status).toBe('available');
    });

    it('Cartão com número normal é aprovado', async () => {
      const { agent, orderId } = await createHeldOrder();

      const res = await agent
        .post(`/api/orders/${orderId}/pay`)
        .send({ paymentMethod: 'card', cardNumber: '4111111111111111' });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('approved');
    });

    it('409 ao tentar pagar uma reserva já processada', async () => {
      const { agent, orderId } = await createHeldOrder();
      await agent
        .post(`/api/orders/${orderId}/pay`)
        .send({ paymentMethod: 'pix' })
        .expect(201);

      const res = await agent
        .post(`/api/orders/${orderId}/pay`)
        .send({ paymentMethod: 'pix' });
      expect(res.status).toBe(409);
    });

    it('concorrencia: duas tentativas simultaneas de pagar a mesma reserva emitem ingresso uma unica vez', async () => {
      const { agent, orderId, seatId } = await createHeldOrder();

      const [resA, resB] = await Promise.all([
        agent.post(`/api/orders/${orderId}/pay`).send({ paymentMethod: 'pix' }),
        agent.post(`/api/orders/${orderId}/pay`).send({ paymentMethod: 'pix' }),
      ]);

      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([201, 409]);

      const approved = [resA, resB].find((res) => res.status === 201)!;
      expect(approved.body.data.status).toBe('approved');
      expect(approved.body.data.tickets).toHaveLength(1);

      const prisma = prismaOf(app);
      const [tickets, payments, seatInDb, orderInDb] = await Promise.all([
        prisma.ticket.findMany({ where: { orderId } }),
        prisma.payment.findMany({ where: { orderId } }),
        prisma.seat.findUniqueOrThrow({ where: { id: seatId } }),
        prisma.order.findUniqueOrThrow({ where: { id: orderId } }),
      ]);

      expect(tickets).toHaveLength(1);
      expect(payments).toHaveLength(1);
      expect(seatInDb.status).toBe('sold');
      expect(orderInDb.status).toBe('paid');
    });

    it('403 ao tentar pagar a reserva de outro cliente', async () => {
      const { orderId } = await createHeldOrder();
      const { agent: stranger } = await registerClient(app);

      const res = await stranger
        .post(`/api/orders/${orderId}/pay`)
        .send({ paymentMethod: 'pix' });
      expect(res.status).toBe(403);
    });

    it('403 ao tentar pagar sem ter completado o cadastro (cliente anônimo)', async () => {
      const { screening, seats } = await makeScreening();
      const agent = anonymousAgent(app);
      await holdSeats(agent, [seats[0].id]);
      const orderRes = await agent
        .post('/api/orders')
        .send({ screeningId: screening.id, seatIds: [seats[0].id] });

      const res = await agent
        .post(`/api/orders/${orderRes.body.data.id}/pay`)
        .send({ paymentMethod: 'pix' });
      expect(res.status).toBe(403);
    });

    it('410 e libera assentos quando a janela de 10 minutos já expirou', async () => {
      const { agent, orderId, seatId } = await createHeldOrder();
      const prisma = prismaOf(app);
      await prisma.order.update({
        where: { id: orderId },
        data: { holdExpires: new Date(Date.now() - 60_000) },
      });

      const res = await agent
        .post(`/api/orders/${orderId}/pay`)
        .send({ paymentMethod: 'pix' });
      expect(res.status).toBe(410);

      const seatInDb = await prisma.seat.findUniqueOrThrow({
        where: { id: seatId },
      });
      expect(seatInDb.status).toBe('available');
      const orderInDb = await prisma.order.findUniqueOrThrow({
        where: { id: orderId },
      });
      expect(orderInDb.status).toBe('cancelled');
    });
  });
});
