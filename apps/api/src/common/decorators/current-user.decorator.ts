import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SessionUserDto } from '@ticket-seller/shared';

interface RequestWithUser {
  user?: SessionUserDto;
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): SessionUserDto => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user) {
      throw new Error(
        'CurrentUser usado fora de uma rota protegida por SessionAuthGuard',
      );
    }
    return request.user;
  },
);
