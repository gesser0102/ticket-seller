import { Module } from '@nestjs/common';
import { GateController } from './gate.controller';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController, GateController],
  providers: [TicketsService],
})
export class TicketsModule {}
