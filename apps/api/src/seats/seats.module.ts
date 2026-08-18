import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { SeatsController } from './seats.controller';
import { SeatsService } from './seats.service';

@Module({
  imports: [RealtimeModule],
  controllers: [SeatsController],
  providers: [SeatsService],
})
export class SeatsModule {}
