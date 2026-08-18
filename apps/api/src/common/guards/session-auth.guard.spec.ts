import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { SessionUserDto } from '@ticket-seller/shared';
import { SessionAuthGuard } from './session-auth.guard';

function contextWithSession(user?: SessionUserDto): ExecutionContext {
  const request: { session: { user?: SessionUserDto }; user?: SessionUserDto } =
    {
      session: { user },
    };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('SessionAuthGuard', () => {
  const guard = new SessionAuthGuard();

  it('permite a requisição quando há usuário na sessão', () => {
    const user: SessionUserDto = {
      id: '1',
      email: 'a@b.com',
      name: 'A',
      role: 'client',
      registered: true,
    };
    const ctx = contextWithSession(user);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('copia o usuário da sessão para request.user', () => {
    const user: SessionUserDto = {
      id: '1',
      email: 'a@b.com',
      name: 'A',
      role: 'client',
      registered: true,
    };
    const ctx = contextWithSession(user);
    guard.canActivate(ctx);
    const request = ctx.switchToHttp().getRequest<{ user?: SessionUserDto }>();
    expect(request.user).toBe(user);
  });

  it('lança UnauthorizedException quando não há sessão', () => {
    const ctx = contextWithSession(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
