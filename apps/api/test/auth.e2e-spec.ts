import { INestApplication } from '@nestjs/common';
import type { RegisterPayload } from '@ticket-seller/shared';
import { createTestApp } from './utils/create-test-app';
import { resetDatabase } from './utils/db';
import { anonymousAgent, prismaOf, registerClient } from './utils/fixtures';

describe('Auth (e2e)', () => {
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

  function validPayload(
    overrides: Partial<RegisterPayload> = {},
  ): RegisterPayload {
    return {
      name: 'Cliente Teste',
      email: `cliente-${Date.now()}@test.dev`,
      password: 'senha123',
      cpf: '52998224725',
      phone: '11987654321',
      birthDate: '1995-05-20',
      ...overrides,
    };
  }

  describe('identidade anônima', () => {
    it('cria um usuário anônimo (role client) na primeira ação que exige dono', async () => {
      const agent = anonymousAgent(app);
      const res = await agent.get('/api/auth/me').expect(401);
      expect(res.body.success).toBe(false);

      const registerRes = await agent
        .post('/api/auth/register')
        .send(validPayload());
      expect(registerRes.status).toBe(200);
      expect(registerRes.body.data.registered).toBe(true);
    });
  });

  describe('POST /api/auth/register', () => {
    it('completa o cadastro e retorna a sessão registrada', async () => {
      const agent = anonymousAgent(app);
      const res = await agent
        .post('/api/auth/register')
        .send(validPayload({ name: 'Ana Teste' }));

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        data: { name: 'Ana Teste', role: 'client', registered: true },
      });
      expect(res.body.data.email).toMatch(/@test\.dev$/);
    });

    it('rejeita e-mail malformado, senha curta, CPF e celular fora do formato (400)', async () => {
      const agent = anonymousAgent(app);
      const res = await agent.post('/api/auth/register').send(
        validPayload({
          email: 'nao-e-email',
          password: '123',
          cpf: '123',
          phone: '1',
        }),
      );
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejeita campos extras não previstos no DTO (whitelist)', async () => {
      const agent = anonymousAgent(app);
      const res = await agent
        .post('/api/auth/register')
        .send({ ...validPayload(), role: 'organizer' });
      expect(res.status).toBe(400);
    });

    it('retorna 409 quando o e-mail já está cadastrado por outra conta', async () => {
      const email = `duplicado-${Date.now()}@test.dev`;
      await registerClient(app, { email });

      const agent = anonymousAgent(app);
      const res = await agent
        .post('/api/auth/register')
        .send(validPayload({ email, cpf: '11144477735' }));
      expect(res.status).toBe(409);
    });

    it('retorna 409 quando o CPF já está cadastrado por outra conta', async () => {
      const cpf = '11144477735';
      await registerClient(app, { cpf });

      const agent = anonymousAgent(app);
      const res = await agent
        .post('/api/auth/register')
        .send(validPayload({ cpf }));
      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('autentica com credenciais corretas', async () => {
      const email = `login-ok-${Date.now()}@test.dev`;
      await registerClient(app, { email, password: 'senha123' });

      const res = await anonymousAgent(app)
        .post('/api/auth/login')
        .send({ email, password: 'senha123' });
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(email);
    });

    it('rejeita senha errada com mensagem genérica (não revela se o e-mail existe)', async () => {
      const email = `login-senha-errada-${Date.now()}@test.dev`;
      await registerClient(app, { email, password: 'senha123' });

      const resWrongPassword = await anonymousAgent(app)
        .post('/api/auth/login')
        .send({ email, password: 'senhaerrada' });
      const resNoSuchEmail = await anonymousAgent(app)
        .post('/api/auth/login')
        .send({ email: 'ninguem@test.dev', password: 'qualquer123' });

      expect(resWrongPassword.status).toBe(401);
      expect(resNoSuchEmail.status).toBe(401);
      expect(resWrongPassword.body.message).toBe(resNoSuchEmail.body.message);
    });
  });

  describe('GET /api/auth/me e POST /api/auth/logout', () => {
    it('me retorna 401 sem sessão e 200 com sessão válida', async () => {
      await anonymousAgent(app).get('/api/auth/me').expect(401);

      const { agent, user } = await registerClient(app);
      const res = await agent.get('/api/auth/me').expect(200);
      expect(res.body.data.id).toBe(user.id);
    });

    it('logout encerra a sessão — me volta a responder 401 em seguida', async () => {
      const { agent } = await registerClient(app);
      await agent.get('/api/auth/me').expect(200);

      await agent.post('/api/auth/logout').expect(200);
      await agent.get('/api/auth/me').expect(401);
    });
  });

  describe('rate limiting do login', () => {
    it('bloqueia com 429 após 5 tentativas malsucedidas na mesma janela', async () => {
      const agent = anonymousAgent(app);
      const attempt = () =>
        agent
          .post('/api/auth/login')
          .send({ email: 'inexistente@test.dev', password: 'errada123' });

      for (let i = 0; i < 5; i++) {
        const res = await attempt();
        expect(res.status).toBe(401);
      }
      const sixth = await attempt();
      expect(sixth.status).toBe(429);
    });
  });
});
