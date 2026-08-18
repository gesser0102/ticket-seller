import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import type { RegisterPayload, SessionUserDto } from '@ticket-seller/shared';
import { PrismaService } from '../prisma/prisma.service';
import { IdentityService } from '../common/identity/identity.service';
import { isUniqueConstraintError } from '../common/utils/prisma-error.util';

const GENERIC_AUTH_ERROR = 'Credenciais inválidas.';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: IdentityService,
  ) {}

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<SessionUserDto> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }

    const passwordMatches = await argon2.verify(user.passwordHash, password);
    if (!passwordMatches) {
      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }

    return this.identity.toSessionUser(user);
  }

  async register(
    currentUserId: string,
    payload: RegisterPayload,
  ): Promise<SessionUserDto> {
    const passwordHash = await argon2.hash(payload.password);

    try {
      const updated = await this.prisma.user.update({
        where: { id: currentUserId },
        data: {
          email: payload.email,
          passwordHash,
          name: payload.name,
          cpf: payload.cpf,
          phone: payload.phone,
          birthDate: new Date(payload.birthDate),
        },
      });
      return this.identity.toSessionUser(updated);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('E-mail ou CPF já cadastrado.');
      }
      throw error;
    }
  }
}
