import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type {
  GateCheckResponseDto,
  SessionUserDto,
} from '@ticket-seller/shared';
import { ApiResult } from '../common/http/api-result';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SessionAuthGuard } from '../common/guards/session-auth.guard';
import { GateValidateDto } from './dto/gate-validate.dto';
import { TicketsService } from './tickets.service';

const MESSAGES: Record<GateCheckResponseDto['result'], string> = {
  valid: 'Ingresso válido. Entrada liberada.',
  already_used: 'Este ingresso já foi utilizado.',
  invalid: 'Código inválido.',
  cancelled: 'Sessão cancelada — este ingresso não vale mais.',
};

@Controller('gate')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('gate')
export class GateController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('validate')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async validate(
    @Body() dto: GateValidateDto,
    @CurrentUser() user: SessionUserDto,
  ): Promise<ApiResult<GateCheckResponseDto>> {
    const result = await this.ticketsService.validateAtGate(dto.code, user.id);
    return new ApiResult(result, MESSAGES[result.result]);
  }
}
