import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SeatDto } from '@ticket-seller/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

interface SeatRow {
  id: string;
  row: string;
  number: number;
  status: string;
  held_by: string | null;
  hold_expires: Date | null;
  ticket_type: string | null;
}

@Injectable()
export class SeatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async listForScreening(
    screeningId: string,
    userId?: string,
  ): Promise<SeatDto[]> {
    const seats = await this.prisma.seat.findMany({
      where: { screeningId },
      orderBy: [{ row: 'asc' }, { number: 'asc' }],
    });
    const now = new Date();
    return seats.map((seat) => {
      const expired =
        seat.status === 'held' && !!seat.holdExpires && seat.holdExpires < now;
      const status = expired ? 'available' : seat.status;
      const heldByMe = status === 'held' && seat.heldBy === userId;
      return {
        id: seat.id,
        row: seat.row,
        number: seat.number,
        status,
        heldByMe,
        ticketType: heldByMe ? seat.ticketType : null,
      };
    });
  }

  async holdSeat(seatId: string, userId: string): Promise<SeatDto> {
    const seat = await this.prisma.seat.findUnique({
      where: { id: seatId },
      select: {
        id: true,
        row: true,
        number: true,
        screeningId: true,
        screening: { select: { status: true } },
      },
    });
    if (!seat || seat.screening.status !== 'published') {
      throw new NotFoundException('Assento não encontrado.');
    }

    const rows = await this.prisma.$queryRaw<SeatRow[]>`
      UPDATE seats
         SET status = 'held', held_by = ${userId}, hold_expires = now() + interval '2 minutes'
       WHERE id = ${seatId}
         AND (status = 'available' OR (status = 'held' AND hold_expires < now()))
       RETURNING id, row, number, status, held_by, hold_expires, ticket_type
    `;

    if (rows.length === 0) {
      throw new ConflictException(
        'Este assento acabou de ser reservado por outra pessoa.',
      );
    }

    const updated = rows[0];

    this.realtime.broadcastSeatHeld(seat.screeningId, {
      seatId: updated.id,
      until: (updated.hold_expires ?? new Date()).toISOString(),
    });

    return this.toDto(updated, userId);
  }

  async releaseSeat(seatId: string, userId: string): Promise<SeatDto> {
    const seat = await this.prisma.seat.findUnique({
      where: { id: seatId },
      select: { screeningId: true },
    });
    if (!seat) {
      throw new NotFoundException('Assento não encontrado.');
    }

    const rows = await this.prisma.$queryRaw<SeatRow[]>`
      UPDATE seats
         SET status = 'available', held_by = NULL, hold_expires = NULL, order_id = NULL, ticket_type = NULL
       WHERE id = ${seatId} AND held_by = ${userId} AND status = 'held'
       RETURNING id, row, number, status, held_by, hold_expires, ticket_type
    `;

    if (rows.length === 0) {
      throw new ConflictException(
        'Este assento não está mais reservado por você.',
      );
    }

    this.realtime.broadcastSeatReleased(seat.screeningId, { seatId });

    return this.toDto(rows[0], userId);
  }

  private toDto(row: SeatRow, userId: string): SeatDto {
    return {
      id: row.id,
      row: row.row,
      number: row.number,
      status: row.status as SeatDto['status'],
      heldByMe: row.held_by === userId,
      ticketType: (row.ticket_type as SeatDto['ticketType']) ?? null,
    };
  }
}
