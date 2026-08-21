import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import type {
  OrderDto,
  PaymentResultDto,
  TicketType,
} from '@ticket-seller/shared';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { generateShortCode } from '../common/utils/short-code.util';
import { isUniqueConstraintError } from '../common/utils/prisma-error.util';
import { ticketToDto } from '../common/mappers/ticket.mapper';

const MAGIC_DECLINE_CARD = '4000000000000002';
const TOKEN_LENGTH = 43;

export type PaymentMethod = 'pix' | 'card';

type LockedOrderRow = {
  id: string;
  screening_id: string;
  client_id: string;
  status: string;
  total_cents: number;
  hold_expires: Date | null;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async pay(
    orderId: string,
    clientId: string,
    method: PaymentMethod,
    cardNumber: string | undefined,
  ): Promise<PaymentResultDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Reserva não encontrada.');
    }
    if (order.clientId !== clientId) {
      throw new ForbiddenException('Esta reserva não pertence a você.');
    }
    if (order.status !== 'hold') {
      throw new ConflictException('Esta reserva já foi processada.');
    }
    if (order.holdExpires && order.holdExpires < new Date()) {
      const released = await this.orders.cancelAndReleaseSeats(orderId);
      if (released) {
        for (const seatId of released.seatIds) {
          this.realtime.broadcastSeatReleased(released.screeningId, { seatId });
        }
      }
      throw new GoneException(
        'Tempo de pagamento esgotado. Os assentos foram liberados.',
      );
    }

    const approved = method === 'pix' || cardNumber !== MAGIC_DECLINE_CARD;

    const result = await this.prisma.$transaction(async (tx) => {
      const [lockedOrder] = await tx.$queryRaw<LockedOrderRow[]>`
        SELECT id, screening_id, client_id, status, total_cents, hold_expires
          FROM orders
         WHERE id = ${orderId}
         FOR UPDATE
      `;
      if (!lockedOrder) {
        throw new NotFoundException('Reserva nao encontrada.');
      }
      if (lockedOrder.client_id !== clientId) {
        throw new ForbiddenException('Esta reserva nao pertence a voce.');
      }
      if (lockedOrder.status !== 'hold') {
        throw new ConflictException('Esta reserva ja foi processada.');
      }
      if (lockedOrder.hold_expires && lockedOrder.hold_expires < new Date()) {
        const releasedSeats = await tx.$queryRaw<{ id: string }[]>`
          UPDATE seats SET status = 'available', held_by = NULL, hold_expires = NULL, order_id = NULL, ticket_type = NULL
           WHERE order_id = ${orderId}
          RETURNING id
        `;
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'cancelled', holdExpires: null },
        });
        return {
          status: 'expired' as const,
          screeningId: lockedOrder.screening_id,
          releasedSeatIds: releasedSeats.map((s) => s.id),
        };
      }

      await tx.payment.create({
        data: {
          orderId,
          status: approved ? 'approved' : 'declined',
          amountCents: lockedOrder.total_cents,
        },
      });

      if (!approved) {
        const releasedSeats = await tx.$queryRaw<{ id: string }[]>`
          UPDATE seats SET status = 'available', held_by = NULL, hold_expires = NULL, order_id = NULL, ticket_type = NULL
           WHERE order_id = ${orderId}
          RETURNING id
        `;
        const cancelledOrder = await tx.order.update({
          where: { id: orderId },
          data: { status: 'cancelled', holdExpires: null },
        });
        return {
          status: 'declined' as const,
          order: this.orderToDto(cancelledOrder),
          screeningId: lockedOrder.screening_id,
          releasedSeatIds: releasedSeats.map((s) => s.id),
        };
      }

      const soldSeats = await tx.$queryRaw<
        { id: string; ticket_type: string | null }[]
      >`
        UPDATE seats SET status = 'sold', hold_expires = NULL, held_by = NULL
         WHERE order_id = ${orderId}
        RETURNING id, ticket_type
      `;

      const MAX_SHORT_CODE_ATTEMPTS = 5;
      const screeningId = lockedOrder.screening_id;
      const createTicketWithShortCode = async (seat: {
        id: string;
        ticket_type: string | null;
      }) => {
        for (let attempt = 1; attempt <= MAX_SHORT_CODE_ATTEMPTS; attempt++) {
          try {
            return await tx.ticket.create({
              data: {
                orderId,
                screeningId,
                seatId: seat.id,
                type: (seat.ticket_type as TicketType | null) ?? 'inteira',
                token: nanoid(TOKEN_LENGTH),
                shortCode: generateShortCode(),
                status: 'valid',
              },
              include: {
                seat: true,
                screening: {
                  include: {
                    movie: { select: { title: true, posterUrl: true } },
                  },
                },
              },
            });
          } catch (error) {
            if (
              isUniqueConstraintError(error) &&
              attempt < MAX_SHORT_CODE_ATTEMPTS
            ) {
              continue;
            }
            throw error;
          }
        }
        throw new Error('unreachable');
      };

      const tickets = await Promise.all(
        soldSeats.map(createTicketWithShortCode),
      );

      const paidOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'paid', holdExpires: null },
      });

      return {
        status: 'approved' as const,
        order: this.orderToDto(paidOrder),
        tickets: tickets.map((ticket) => ticketToDto(ticket)),
        screeningId: lockedOrder.screening_id,
        soldSeatIds: soldSeats.map((s) => s.id),
      };
    });

    if (result.status === 'expired') {
      for (const seatId of result.releasedSeatIds) {
        this.realtime.broadcastSeatReleased(result.screeningId, { seatId });
      }
      throw new GoneException(
        'Tempo de pagamento esgotado. Os assentos foram liberados.',
      );
    }

    if (result.status === 'approved') {
      for (const seatId of result.soldSeatIds) {
        this.realtime.broadcastSeatSold(result.screeningId, { seatId });
      }
      return {
        status: result.status,
        order: result.order,
        tickets: result.tickets,
      };
    }
    for (const seatId of result.releasedSeatIds) {
      this.realtime.broadcastSeatReleased(result.screeningId, { seatId });
    }
    return { status: result.status, order: result.order };
  }

  private orderToDto(order: {
    id: string;
    screeningId: string;
    status: string;
    totalCents: number;
    holdExpires: Date | null;
  }): OrderDto {
    return {
      id: order.id,
      screeningId: order.screeningId,
      status: order.status as OrderDto['status'],
      totalCents: order.totalCents,
      holdExpires: order.holdExpires ? order.holdExpires.toISOString() : null,
    };
  }
}
