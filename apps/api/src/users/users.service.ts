import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import type { User } from '@prisma/client';
import type { UserProfileDto } from '@ticket-seller/shared';
import { PrismaService } from '../prisma/prisma.service';
import { isUniqueConstraintError } from '../common/utils/prisma-error.util';
import { UpdateProfileDto } from './dto/update-profile.dto';

function toProfileDto(user: User): UserProfileDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    cpf: user.cpf,
    phone: user.phone,
    birthDate: user.birthDate
      ? user.birthDate.toISOString().slice(0, 10)
      : null,
    role: user.role,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return toProfileDto(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: dto.name,
          email: dto.email,
          cpf: dto.cpf,
          phone: dto.phone,
          birthDate: new Date(dto.birthDate),
        },
      });
      return toProfileDto(updated);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'E-mail ou CPF já cadastrado por outra conta.',
        );
      }
      throw error;
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (
      !user.passwordHash ||
      !(await argon2.verify(user.passwordHash, currentPassword))
    ) {
      throw new UnauthorizedException('Senha atual incorreta.');
    }
    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }
}
