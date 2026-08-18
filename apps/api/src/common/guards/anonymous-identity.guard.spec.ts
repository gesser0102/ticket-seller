import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { SessionData } from 'express-session';
import type { SessionUserDto } from '@ticket-seller/shared';
import { AnonymousIdentityGuard } from './anonymous-identity.guard';
import { IdentityService } from '../identity/identity.service';

function contextWithSession(session: Partial<SessionData>): ExecutionContext {
  const request: { session: Partial<SessionData>; user?: SessionUserDto } = {
    session,
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AnonymousIdentityGuard', () => {
  let identity: { ensureSession: jest.Mock };
  let guard: AnonymousIdentityGuard;

  beforeEach(() => {
    identity = { ensureSession: jest.fn() };
    guard = new AnonymousIdentityGuard(identity as unknown as IdentityService);
  });

  it('cria/garante a identidade anônima e permite a requisição quando não há sessão ainda', async () => {
    const created: SessionUserDto = {
      id: 'novo',
      email: null,
      name: null,
      role: 'client',
      registered: false,
    };
    identity.ensureSession.mockResolvedValue(created);
    const session: Partial<SessionData> = {};
    const ctx = contextWithSession(session);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(identity.ensureSession).toHaveBeenCalledWith(session);
    const request = ctx.switchToHttp().getRequest<{ user?: SessionUserDto }>();
    expect(request.user).toBe(created);
  });

  it('permite quando já existe uma sessão de cliente', async () => {
    const existing: SessionUserDto = {
      id: 'existente',
      email: 'c@c.com',
      name: 'C',
      role: 'client',
      registered: true,
    };
    identity.ensureSession.mockResolvedValue(existing);
    const ctx = contextWithSession({ user: existing });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('lança ForbiddenException quando a sessão existente é de organizer/gate', async () => {
    const staff: SessionUserDto = {
      id: 'staff',
      email: 's@s.com',
      name: 'S',
      role: 'organizer',
      registered: true,
    };
    const ctx = contextWithSession({ user: staff });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(identity.ensureSession).not.toHaveBeenCalled();
  });
});
