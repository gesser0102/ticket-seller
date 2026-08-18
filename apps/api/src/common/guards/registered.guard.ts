import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import type { SessionUserDto } from '@ticket-seller/shared';

interface RequestWithUser extends Request {
  user?: SessionUserDto;
}

@Injectable()
export class RegisteredGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const sessionUser = request.session.user;
    if (!sessionUser) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
    if (sessionUser.role !== 'client') {
      throw new ForbiddenException('Esta ação é exclusiva de clientes.');
    }
    if (!sessionUser.registered) {
      throw new ForbiddenException('Complete seu cadastro antes de continuar.');
    }
    request.user = sessionUser;
    return true;
  }
}
