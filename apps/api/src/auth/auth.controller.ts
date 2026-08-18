import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { SessionUserDto } from '@ticket-seller/shared';
import { ApiResult } from '../common/http/api-result';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AnonymousIdentityGuard } from '../common/guards/anonymous-identity.guard';
import { SessionAuthGuard } from '../common/guards/session-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<ApiResult<SessionUserDto>> {
    const user = await this.authService.validateCredentials(
      dto.email,
      dto.password,
    );
    req.session.user = user;
    return new ApiResult(user, 'Login realizado.');
  }

  @Post('register')
  @HttpCode(200)
  @UseGuards(AnonymousIdentityGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(
    @Body() dto: RegisterDto,
    @CurrentUser() currentUser: SessionUserDto,
    @Req() req: Request,
  ): Promise<ApiResult<SessionUserDto>> {
    const registered = await this.authService.register(currentUser.id, dto);
    req.session.user = registered;
    return new ApiResult(registered, 'Cadastro concluído.');
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(SessionAuthGuard)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResult<null>> {
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err: unknown) => {
        if (err)
          reject(
            err instanceof Error ? err : new Error('Falha ao encerrar sessão.'),
          );
        else resolve();
      });
    });
    res.clearCookie('connect.sid');
    return new ApiResult(null, 'Sessão encerrada.');
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@CurrentUser() user: SessionUserDto): ApiResult<SessionUserDto> {
    return new ApiResult(user);
  }
}
