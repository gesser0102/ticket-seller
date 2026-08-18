import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import type { SessionUserDto, UserProfileDto } from '@ticket-seller/shared';
import { ApiResult } from '../common/http/api-result';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RegisteredGuard } from '../common/guards/registered.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
@UseGuards(RegisteredGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: SessionUserDto): Promise<UserProfileDto> {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: SessionUserDto,
    @Body() dto: UpdateProfileDto,
    @Req() req: Request,
  ): Promise<ApiResult<UserProfileDto>> {
    const profile = await this.usersService.updateProfile(user.id, dto);
    req.session.user = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      registered: true,
    };
    return new ApiResult(profile, 'Perfil atualizado.');
  }

  @Patch('me/password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async changePassword(
    @CurrentUser() user: SessionUserDto,
    @Body() dto: ChangePasswordDto,
  ): Promise<ApiResult<null>> {
    await this.usersService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return new ApiResult(null, 'Senha alterada.');
  }
}
