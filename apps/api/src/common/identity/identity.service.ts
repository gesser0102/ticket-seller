import { Injectable } from '@nestjs/common';
import type { SessionData } from 'express-session';
import type { Role, SessionUserDto } from '@ticket-seller/shared';
import { PrismaService } from '../../prisma/prisma.service';

interface UserLike {
  id: string;
  email: string | null;
  name: string | null;
  role: Role;
  passwordHash: string | null;
}

@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaService) {}

  toSessionUser(user: UserLike): SessionUserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      registered: user.passwordHash !== null,
    };
  }

  async ensureSession(session: SessionData): Promise<SessionUserDto> {
    if (session.user) return session.user;
    const user = await this.prisma.user.create({ data: { role: 'client' } });
    const sessionUser = this.toSessionUser(user);
    session.user = sessionUser;
    return sessionUser;
  }
}
