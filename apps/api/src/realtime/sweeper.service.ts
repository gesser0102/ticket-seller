import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from './realtime.gateway';

const SWEEP_INTERVAL_MS = 5000;

@Injectable()
export class SweeperService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly realtime: RealtimeGateway,
  ) {}

  @Interval(SWEEP_INTERVAL_MS)
  async sweepExpiredSeatHolds(): Promise<void> {
    const released = await this.prisma.$queryRaw<
      { id: string; screening_id: string }[]
    >`
      UPDATE seats
         SET status = 'available', held_by = NULL, hold_expires = NULL
       WHERE status = 'held' AND hold_expires < now() AND order_id IS NULL
      RETURNING id, screening_id
    `;
    for (const seat of released) {
      this.realtime.broadcastSeatReleased(seat.screening_id, {
        seatId: seat.id,
      });
    }
  }

  @Interval(SWEEP_INTERVAL_MS)
  async sweepExpiredOrders(): Promise<void> {
    const released = await this.orders.cancelExpiredHoldsAndReleaseSeats();
    for (const { screeningId, seatId } of released) {
      this.realtime.broadcastSeatReleased(screeningId, { seatId });
    }
  }
}
