import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { IdentityService } from '../common/identity/identity.service';

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

describe('AuthService', () => {
  let prisma: { user: { findUnique: jest.Mock; update: jest.Mock } };
  let identity: { toSessionUser: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = { user: { findUnique: jest.fn(), update: jest.fn() } };
    identity = {
      toSessionUser: jest.fn(
        (u: {
          id: string;
          email: string | null;
          name: string | null;
          role: string;
        }) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          registered: true,
        }),
      ),
    };
    service = new AuthService(
      prisma as unknown as PrismaService,
      identity as unknown as IdentityService,
    );
  });

  describe('validateCredentials', () => {
    it('retorna a sessão quando a senha confere', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'a@a.com',
        passwordHash: 'hash-armazenado',
        name: 'A',
        role: 'client',
      });
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.validateCredentials(
        'a@a.com',
        'senha-certa',
      );

      expect(argon2.verify).toHaveBeenCalledWith(
        'hash-armazenado',
        'senha-certa',
      );
      expect(result.email).toBe('a@a.com');
    });

    it('lança UnauthorizedException quando o e-mail não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.validateCredentials('ninguem@a.com', 'x'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException quando a conta ainda não tem senha (anônima)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'a@a.com',
        passwordHash: null,
        name: null,
        role: 'client',
      });
      await expect(service.validateCredentials('a@a.com', 'x')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lança UnauthorizedException quando a senha está errada', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'a@a.com',
        passwordHash: 'hash-armazenado',
        name: 'A',
        role: 'client',
      });
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateCredentials('a@a.com', 'senha-errada'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('a mensagem de erro é idêntica para e-mail inexistente e senha errada (não revela qual)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const noSuchEmail = await service
        .validateCredentials('ninguem@a.com', 'x')
        .catch((e: Error) => e.message);

      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'a@a.com',
        passwordHash: 'hash',
        name: 'A',
        role: 'client',
      });
      (argon2.verify as jest.Mock).mockResolvedValue(false);
      const wrongPassword = await service
        .validateCredentials('a@a.com', 'errada')
        .catch((e: Error) => e.message);

      expect(noSuchEmail).toBe(wrongPassword);
    });
  });

  describe('register', () => {
    it('faz o hash da senha e completa a conta anônima existente (mesmo id)', async () => {
      (argon2.hash as jest.Mock).mockResolvedValue('hash-novo');
      prisma.user.update.mockResolvedValue({
        id: 'anonimo-1',
        email: 'novo@a.com',
        name: 'Novo',
        role: 'client',
      });

      await service.register('anonimo-1', {
        name: 'Novo',
        email: 'novo@a.com',
        password: 'senha123',
        cpf: '11144477735',
        phone: '11987654321',
        birthDate: '1995-05-20',
      });

      expect(argon2.hash).toHaveBeenCalledWith('senha123');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'anonimo-1' },
        data: expect.objectContaining({
          passwordHash: 'hash-novo',
          email: 'novo@a.com',
        }),
      });
    });

    it('lança ConflictException quando e-mail ou CPF já pertencem a outra conta (violação de unicidade)', async () => {
      (argon2.hash as jest.Mock).mockResolvedValue('hash-novo');
      prisma.user.update.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.register('anonimo-1', {
          name: 'Novo',
          email: 'duplicado@a.com',
          password: 'senha123',
          cpf: '11144477735',
          phone: '11987654321',
          birthDate: '1995-05-20',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('propaga erros que não são de unicidade sem mascarar', async () => {
      (argon2.hash as jest.Mock).mockResolvedValue('hash-novo');
      const boom = new Error('falha inesperada de banco');
      prisma.user.update.mockRejectedValue(boom);

      await expect(
        service.register('anonimo-1', {
          name: 'Novo',
          email: 'novo@a.com',
          password: 'senha123',
          cpf: '11144477735',
          phone: '11987654321',
          birthDate: '1995-05-20',
        }),
      ).rejects.toBe(boom);
    });
  });
});
