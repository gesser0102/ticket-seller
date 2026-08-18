import { Module } from '@nestjs/common';
import { TmdbModule } from '../tmdb/tmdb.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { OrganizerController } from './organizer.controller';
import { OrganizerService } from './organizer.service';

@Module({
  imports: [TmdbModule, RealtimeModule],
  controllers: [OrganizerController],
  providers: [OrganizerService],
})
export class OrganizerModule {}
