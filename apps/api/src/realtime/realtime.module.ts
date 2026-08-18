import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { RealtimeGateway } from './realtime.gateway';
import { SweeperService } from './sweeper.service';

@Module({
  imports: [OrdersModule],
  providers: [RealtimeGateway, SweeperService],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
