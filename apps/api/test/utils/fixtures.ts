import type { INestApplication } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomInt } from 'node:crypto';
import request from 'supertest';
import type { RegisterPayload, SessionUserDto } from '@ticket-seller/shared';
import { PrismaService } from '../../src/prisma/prisma.service';

let counter = 0;
function unique(): string {
  counter += 1;
  return `${Date.now()}-${counter}-${randomInt(1_000_000)}`;
}

function randomCpf(): string {
  let digits = '';
  for (let i = 0; i < 11; i++) digits += randomInt(10).toString();
  return digits;
}

let ipCounter = 0;
function nextTestIp(): string {
  ipCounter += 1;
  return `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`;
}

export interface TestAgent {
  get(url: string): request.Test;
  post(url: string): request.Test;
  patch(url: string): request.Test;
  delete(url: string): request.Test;
}

function withOwnIp(agent: ReturnType<typeof request.agent>): TestAgent {
  const ip = nextTestIp();
  return {
    get: (url) => agent.get(url).set('X-Forwarded-For', ip),
    post: (url) => agent.post(url).set('X-Forwarded-For', ip),
    patch: (url) => agent.patch(url).set('X-Forwarded-For', ip),
    delete: (url) => agent.delete(url).set('X-Forwarded-For', ip),
  };
}

export function prismaOf(app: INestApplication): PrismaService {
  return app.get(PrismaService);
}

export async function createOrganizer(
  app: INestApplication,
  overrides: { name?: string; email?: string } = {},
) {
  const prisma = prismaOf(app);
  return prisma.user.create({
    data: {
      role: 'organizer',
      name: overrides.name ?? 'Organizador Teste',
      email: overrides.email ?? `organizador-${unique()}@test.dev`,
      passwordHash: await argon2.hash('senha123'),
    },
  });
}

export async function createGateUser(
  app: INestApplication,
  overrides: { name?: string; email?: string } = {},
) {
  const prisma = prismaOf(app);
  return prisma.user.create({
    data: {
      role: 'gate',
      name: overrides.name ?? 'Portaria Teste',
      email: overrides.email ?? `portaria-${unique()}@test.dev`,
      passwordHash: await argon2.hash('senha123'),
    },
  });
}

export async function createMovie(
  app: INestApplication,
  organizerId: string,
  overrides: Partial<{ title: string; externalRef: string }> = {},
) {
  const prisma = prismaOf(app);
  return prisma.movie.create({
    data: {
      organizerId,
      source: 'tmdb',
      externalRef: overrides.externalRef ?? `ext-${unique()}`,
      title: overrides.title ?? 'Filme Teste',
      posterUrl: 'https://example.com/poster.jpg',
      backdropUrl: 'https://example.com/backdrop.jpg',
      synopsis: 'Sinopse de teste.',
    },
  });
}

export async function createScreening(
  app: INestApplication,
  movieId: string,
  overrides: Partial<{
    venue: string;
    startsAt: Date;
    priceCents: number;
    status: 'draft' | 'published' | 'cancelled';
  }> = {},
) {
  const prisma = prismaOf(app);
  return prisma.screening.create({
    data: {
      movieId,
      venue: overrides.venue ?? 'Sala 1',
      startsAt:
        overrides.startsAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
      priceCents: overrides.priceCents ?? 4500,
      status: overrides.status ?? 'published',
    },
  });
}

export async function createSeats(
  app: INestApplication,
  screeningId: string,
  rows = ['A', 'B'],
  perRow = 5,
) {
  const prisma = prismaOf(app);
  const data: { screeningId: string; row: string; number: number }[] = [];
  for (const row of rows) {
    for (let number = 1; number <= perRow; number++) {
      data.push({ screeningId, row, number });
    }
  }
  await prisma.seat.createMany({ data });
  return prisma.seat.findMany({
    where: { screeningId },
    orderBy: [{ row: 'asc' }, { number: 'asc' }],
  });
}

export interface ClientFixture {
  agent: TestAgent;
  user: SessionUserDto;
}

export async function registerClient(
  app: INestApplication,
  overrides: Partial<RegisterPayload> = {},
): Promise<ClientFixture> {
  const agent = withOwnIp(request.agent(app.getHttpServer()));
  const payload: RegisterPayload = {
    name: 'Cliente Teste',
    email: `cliente-${unique()}@test.dev`,
    password: 'senha123',
    cpf: randomCpf(),
    phone: '11987654321',
    birthDate: '1995-05-20',
    ...overrides,
  };
  const res = await agent.post('/api/auth/register').send(payload);
  if (res.status !== 200) {
    throw new Error(
      `Falha ao registrar cliente de teste: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }
  return { agent, user: res.body.data as SessionUserDto };
}

export async function loginAs(
  app: INestApplication,
  email: string,
  password = 'senha123',
): Promise<ClientFixture> {
  const agent = withOwnIp(request.agent(app.getHttpServer()));
  const res = await agent.post('/api/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(
      `Falha ao logar usuário de teste: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }
  return { agent, user: res.body.data as SessionUserDto };
}

export function anonymousAgent(app: INestApplication): TestAgent {
  return withOwnIp(request.agent(app.getHttpServer()));
}
