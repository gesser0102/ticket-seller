import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { SeatDto, SessionUserDto } from '@ticket-seller/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OptionalUser } from '../common/decorators/optional-user.decorator';
import { AnonymousIdentityGuard } from '../common/guards/anonymous-identity.guard';
import { SeatsService } from './seats.service';

@Controller()
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Get('screenings/:screeningId/seats')
  list(
    @Param('screeningId') screeningId: string,
    @OptionalUser() user?: SessionUserDto,
  ): Promise<SeatDto[]> {
    return this.seatsService.listForScreening(screeningId, user?.id);
  }

  @Post('seats/:id/hold')
  @UseGuards(AnonymousIdentityGuard)
  @Throttle({ default: { limit: 20, ttl: 10_000 } })
  hold(
    @Param('id') id: string,
    @CurrentUser() user: SessionUserDto,
  ): Promise<SeatDto> {
    return this.seatsService.holdSeat(id, user.id);
  }

  @Delete('seats/:id/hold')
  @UseGuards(AnonymousIdentityGuard)
  @Throttle({ default: { limit: 20, ttl: 10_000 } })
  release(
    @Param('id') id: string,
    @CurrentUser() user: SessionUserDto,
  ): Promise<SeatDto> {
    return this.seatsService.releaseSeat(id, user.id);
  }
}
