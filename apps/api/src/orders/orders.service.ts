import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { OrderDto, SetTicketTypesPayload } from '@ticket-seller/shared';
import { PrismaService } from '../prisma/prisma.service';

const HOLD_WINDOW_MS = 10 * 60 * 1000;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(
    screeningId: string,
    seatIds: string[],
    clientId: string,
  ): Promise<OrderDto> {
    const screening = await this.prisma.screening.findFirst({
      where: { id: screeningId, status: 'published' },
    });
    if (!screening) {
      throw new NotFoundException('Sessão não encontrada.');
    }

    const uniqueSeatIds = Array.from(new Set(seatIds));
    const totalCents = uniqueSeatIds.length * screening.priceCents;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          screeningId,
          clientId,
          status: 'hold',
          totalCents,
          holdExpires: new Date(Date.now() + HOLD_WINDOW_MS),
        },
      });

      const linked = await tx.$queryRaw<{ id: string }[]>`
        UPDATE seats
           SET order_id = ${order.id}, ticket_type = 'inteira'
         WHERE id IN (${Prisma.join(uniqueSeatIds)})
           AND screening_id = ${screeningId}
           AND held_by = ${clientId}
           AND status = 'held'
        RETURNING id
      `;

      if (linked.length !== uniqueSeatIds.length) {
        throw new ConflictException(
          'Um ou mais assentos não estão mais reservados para você. Selecione novamente.',
        );
      }

      return this.toDto(order);
    });
  }

  async setTicketTypes(
    orderId: string,
    clientId: string,
    payload: SetTicketTypesPayload,
  ): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { screening: { select: { priceCents: true } } },
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

    return this.prisma.$transaction(async (tx) => {
      for (const item of payload.items) {
        const { count } = await tx.seat.updateMany({
          where: { id: item.seatId, orderId },
          data: { ticketType: item.type },
        });
        if (count === 0) {
          throw new ConflictException(
            'Um dos assentos não pertence a esta reserva.',
          );
        }
      }

      const seats = await tx.seat.findMany({
        where: { orderId },
        select: { ticketType: true },
      });
      const fullPrice = order.screening.priceCents;
      const halfPrice = Math.round(fullPrice / 2);
      const totalCents = seats.reduce(
        (sum, seat) =>
          sum + (seat.ticketType === 'meia' ? halfPrice : fullPrice),
        0,
      );

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { totalCents },
      });
      return this.toDto(updated);
    });
  }

  async cancelAndReleaseSeats(
    orderId: string,
  ): Promise<{ screeningId: string; seatIds: string[] } | null> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id: orderId, status: 'hold' },
        data: { status: 'cancelled', holdExpires: null },
      });
      if (count === 0) return null;

      const releasedSeats = await tx.$queryRaw<{ id: string }[]>`
        UPDATE seats SET status = 'available', held_by = NULL, hold_expires = NULL, order_id = NULL, ticket_type = NULL
         WHERE order_id = ${orderId}
        RETURNING id
      `;
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { screeningId: true },
      });
      return {
        screeningId: order.screeningId,
        seatIds: releasedSeats.map((s) => s.id),
      };
    });
  }

  async getOwnOrder(orderId: string, clientId: string): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Reserva não encontrada.');
    }
    if (order.clientId !== clientId) {
      throw new ForbiddenException('Esta reserva não pertence a você.');
    }
    return this.toDto(order);
  }

  private toDto(order: {
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
