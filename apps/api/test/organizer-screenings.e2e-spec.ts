import { INestApplication } from '@nestjs/common';
import { createTestApp } from './utils/create-test-app';
import { resetDatabase } from './utils/db';
import {
  createMovie,
  createOrganizer,
  createScreening,
  createSeats,
  loginAs,
  prismaOf,
  registerClient,
} from './utils/fixtures';

describe('Organizer — cancelar/excluir sessão (e2e)', () => {
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

  it('cancelar uma sessão com ingresso vendido: libera assento, cancela pedido e ingresso', async () => {
    const organizer = await createOrganizer(app);
    const movie = await createMovie(app, organizer.id);
    const screening = await createScreening(app, movie.id);
    const seats = await createSeats(app, screening.id, ['A'], 1);

    const { agent: client } = await registerClient(app);
    await client.post(`/api/seats/${seats[0].id}/hold`).expect(201);
    const orderRes = await client
      .post('/api/orders')
      .send({ screeningId: screening.id, seatIds: [seats[0].id] });
    await client
      .post(`/api/orders/${orderRes.body.data.id}/pay`)
      .send({ paymentMethod: 'pix' })
      .expect(201);

    const { agent: organizerAgent } = await loginAs(app, organizer.email!);
    const cancelRes = await organizerAgent.post(
      `/api/organizer/screenings/${screening.id}/cancel`,
    );
    expect(cancelRes.status).toBe(201);
    expect(cancelRes.body.data.status).toBe('cancelled');

    const prisma = prismaOf(app);
    const seatInDb = await prisma.seat.findUniqueOrThrow({
      where: { id: seats[0].id },
    });
    expect(seatInDb.status).toBe('available');
    expect(seatInDb.orderId).toBeNull();

    const orderInDb = await prisma.order.findUniqueOrThrow({
      where: { id: orderRes.body.data.id },
    });
    expect(orderInDb.status).toBe('cancelled');

    const ticketInDb = await prisma.ticket.findFirstOrThrow({
      where: { orderId: orderRes.body.data.id },
    });
    expect(ticketInDb.status).toBe('cancelled');
  });

  it('409 ao tentar cancelar uma sessão que já está cancelada', async () => {
    const organizer = await createOrganizer(app);
    const movie = await createMovie(app, organizer.id);
    const screening = await createScreening(app, movie.id, {
      status: 'cancelled',
    });

    const { agent } = await loginAs(app, organizer.email!);
    const res = await agent.post(
      `/api/organizer/screenings/${screening.id}/cancel`,
    );
    expect(res.status).toBe(409);
  });

  it('409 ao tentar excluir sessão que já tem pedido/ingresso — a sessão permanece intacta', async () => {
    const organizer = await createOrganizer(app);
    const movie = await createMovie(app, organizer.id);
    const screening = await createScreening(app, movie.id);
    const seats = await createSeats(app, screening.id, ['A'], 1);
    const { agent: client } = await registerClient(app);
    await client.post(`/api/seats/${seats[0].id}/hold`).expect(201);
    await client
      .post('/api/orders')
      .send({ screeningId: screening.id, seatIds: [seats[0].id] });

    const { agent: organizerAgent } = await loginAs(app, organizer.email!);
    const res = await organizerAgent.delete(
      `/api/organizer/screenings/${screening.id}`,
    );
    expect(res.status).toBe(409);

    const prisma = prismaOf(app);
    const stillThere = await prisma.screening.findUnique({
      where: { id: screening.id },
    });
    expect(stillThere).not.toBeNull();
  });

  it('exclui sem problema uma sessão sem nenhuma venda', async () => {
    const organizer = await createOrganizer(app);
    const movie = await createMovie(app, organizer.id);
    const screening = await createScreening(app, movie.id);
    await createSeats(app, screening.id, ['A'], 4);

    const { agent } = await loginAs(app, organizer.email!);
    await agent.delete(`/api/organizer/screenings/${screening.id}`).expect(200);

    const prisma = prismaOf(app);
    const gone = await prisma.screening.findUnique({
      where: { id: screening.id },
    });
    expect(gone).toBeNull();
    const seatsGone = await prisma.seat.findMany({
      where: { screeningId: screening.id },
    });
    expect(seatsGone).toHaveLength(0);
  });

  it('editar sala/preço não altera o total já travado de um pedido pago anteriormente', async () => {
    const organizer = await createOrganizer(app);
    const movie = await createMovie(app, organizer.id);
    const screening = await createScreening(app, movie.id, {
      priceCents: 4000,
    });
    const seats = await createSeats(app, screening.id, ['A'], 1);
    const { agent: client } = await registerClient(app);
    await client.post(`/api/seats/${seats[0].id}/hold`).expect(201);
    const orderRes = await client
      .post('/api/orders')
      .send({ screeningId: screening.id, seatIds: [seats[0].id] });
    await client
      .post(`/api/orders/${orderRes.body.data.id}/pay`)
      .send({ paymentMethod: 'pix' })
      .expect(201);

    const { agent: organizerAgent } = await loginAs(app, organizer.email!);
    await organizerAgent
      .patch(`/api/organizer/screenings/${screening.id}`)
      .send({ priceCents: 9999 })
      .expect(200);

    const prisma = prismaOf(app);
    const orderInDb = await prisma.order.findUniqueOrThrow({
      where: { id: orderRes.body.data.id },
    });
    expect(orderInDb.totalCents).toBe(4000);
  });
});
