import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import type { SessionUserDto } from '@ticket-seller/shared';

interface RequestWithUser extends Request {
  user?: SessionUserDto;
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const sessionUser = request.session.user;
    if (!sessionUser) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
    request.user = sessionUser;
    return true;
  }
}
