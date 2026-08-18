import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { SessionUserDto, TicketDto } from '@ticket-seller/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RegisteredGuard } from '../common/guards/registered.guard';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('mine')
  @UseGuards(RegisteredGuard)
  mine(@CurrentUser() user: SessionUserDto): Promise<TicketDto[]> {
    return this.ticketsService.listMine(user.id);
  }

  @Get('share/:token')
  share(@Param('token') token: string): Promise<TicketDto> {
    return this.ticketsService.getByTokenPublic(token);
  }
}
