import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import type { SessionUserDto } from '@ticket-seller/shared';
import { IdentityService } from '../identity/identity.service';

interface RequestWithUser extends Request {
  user?: SessionUserDto;
}

@Injectable()
export class AnonymousIdentityGuard implements CanActivate {
  constructor(private readonly identity: IdentityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const existing = request.session.user;
    if (existing && existing.role !== 'client') {
      throw new ForbiddenException('Esta ação é exclusiva de clientes.');
    }
    request.user = await this.identity.ensureSession(request.session);
    return true;
  }
}
