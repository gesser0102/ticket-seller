import type { SessionData } from 'express-session';
import { IdentityService } from './identity.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('IdentityService', () => {
  let prisma: { user: { create: jest.Mock } };
  let service: IdentityService;

  beforeEach(() => {
    prisma = { user: { create: jest.fn() } };
    service = new IdentityService(prisma as unknown as PrismaService);
  });

  describe('toSessionUser', () => {
    it('deriva registered=true a partir de passwordHash não-nulo, nunca do e-mail', () => {
      const dto = service.toSessionUser({
        id: '1',
        email: null,
        name: null,
        role: 'client',
        passwordHash: 'hash-qualquer',
      });
      expect(dto.registered).toBe(true);
    });

    it('deriva registered=false quando passwordHash é nulo, mesmo com e-mail preenchido', () => {
      const dto = service.toSessionUser({
        id: '1',
        email: 'legado@teste.dev',
        name: 'Legado',
        role: 'client',
        passwordHash: null,
      });
      expect(dto.registered).toBe(false);
    });
  });

  describe('ensureSession', () => {
    it('retorna a sessão existente sem tocar o banco quando já há um usuário', async () => {
      const existing = {
        id: '1',
        email: 'a@a.com',
        name: 'A',
        role: 'client' as const,
        registered: true,
      };
      const session = { user: existing } as unknown as SessionData;

      const result = await service.ensureSession(session);

      expect(result).toBe(existing);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('cria um usuário anônimo (role client) e grava na sessão quando ainda não existe', async () => {
      prisma.user.create.mockResolvedValue({
        id: 'novo-id',
        email: null,
        name: null,
        role: 'client',
        passwordHash: null,
      });
      const session = {} as SessionData;

      const result = await service.ensureSession(session);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { role: 'client' },
      });
      expect(result).toEqual({
        id: 'novo-id',
        email: null,
        name: null,
        role: 'client',
        registered: false,
      });
      expect(session.user).toEqual(result);
    });
  });
});
