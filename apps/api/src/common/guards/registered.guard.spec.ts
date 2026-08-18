import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import type { SessionUserDto } from '@ticket-seller/shared';
import { RegisteredGuard } from './registered.guard';

function contextWithSession(user?: SessionUserDto): ExecutionContext {
  const request: { session: { user?: SessionUserDto }; user?: SessionUserDto } =
    {
      session: { user },
    };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const registeredClient: SessionUserDto = {
  id: '1',
  email: 'cliente@teste.dev',
  name: 'Cliente',
  role: 'client',
  registered: true,
};

describe('RegisteredGuard', () => {
  const guard = new RegisteredGuard();

  it('permite um cliente com cadastro completo', () => {
    expect(guard.canActivate(contextWithSession(registeredClient))).toBe(true);
  });

  it('lança UnauthorizedException (401) quando não há sessão nenhuma', () => {
    expect(() => guard.canActivate(contextWithSession(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it('lança ForbiddenException (403) quando o papel não é client', () => {
    const organizer: SessionUserDto = {
      ...registeredClient,
      role: 'organizer',
    };
    expect(() => guard.canActivate(contextWithSession(organizer))).toThrow(
      ForbiddenException,
    );
  });

  it('lança ForbiddenException (403) quando o cliente ainda não completou o cadastro', () => {
    const anonymous: SessionUserDto = {
      ...registeredClient,
      registered: false,
      email: null,
      name: null,
    };
    expect(() => guard.canActivate(contextWithSession(anonymous))).toThrow(
      ForbiddenException,
    );
  });
});
