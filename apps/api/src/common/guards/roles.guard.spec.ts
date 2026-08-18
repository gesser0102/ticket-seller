import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SessionUserDto } from '@ticket-seller/shared';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

function contextWithUserAndRoles(
  user: SessionUserDto | undefined,
  roles: SessionUserDto['role'][] | undefined,
): ExecutionContext {
  const request: { user?: SessionUserDto } = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () =>
      roles === undefined ? undefined : { [ROLES_KEY]: roles },
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  function makeGuard(rolesForHandler: SessionUserDto['role'][] | undefined) {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(rolesForHandler);
    return new RolesGuard(reflector);
  }

  const organizer: SessionUserDto = {
    id: '1',
    email: 'o@o.com',
    name: 'O',
    role: 'organizer',
    registered: true,
  };

  it('permite quando a rota não declara @Roles nenhuma', () => {
    const guard = makeGuard(undefined);
    expect(
      guard.canActivate(contextWithUserAndRoles(organizer, undefined)),
    ).toBe(true);
  });

  it('permite quando o papel do usuário está entre os exigidos', () => {
    const guard = makeGuard(['organizer']);
    expect(
      guard.canActivate(contextWithUserAndRoles(organizer, ['organizer'])),
    ).toBe(true);
  });

  it('lança ForbiddenException quando o papel não está entre os exigidos', () => {
    const guard = makeGuard(['gate']);
    expect(() =>
      guard.canActivate(contextWithUserAndRoles(organizer, ['gate'])),
    ).toThrow(ForbiddenException);
  });

  it('lança ForbiddenException quando não há usuário na requisição', () => {
    const guard = makeGuard(['organizer']);
    expect(() =>
      guard.canActivate(contextWithUserAndRoles(undefined, ['organizer'])),
    ).toThrow(ForbiddenException);
  });
});
