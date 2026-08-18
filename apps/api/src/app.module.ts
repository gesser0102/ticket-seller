import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';
import { MoviesModule } from './movies/movies.module';
import { OrdersModule } from './orders/orders.module';
import { OrganizerModule } from './organizer/organizer.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ScreeningsModule } from './screenings/screenings.module';
import { SeatsModule } from './seats/seats.module';
import { TicketsModule } from './tickets/tickets.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    CommonModule,
    PrismaModule,
    AuthModule,
    MoviesModule,
    ScreeningsModule,
    SeatsModule,
    OrdersModule,
    OrganizerModule,
    PaymentsModule,
    TicketsModule,
    RealtimeModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class AppModule {}
