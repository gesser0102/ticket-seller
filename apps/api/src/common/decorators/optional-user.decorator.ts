import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { SessionUserDto } from '@ticket-seller/shared';

export const OptionalUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): SessionUserDto | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.session?.user;
  },
);
