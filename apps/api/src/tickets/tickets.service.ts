import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  GateCheckResponseDto,
  GateTicketDto,
  TicketDto,
} from '@ticket-seller/shared';
import { PrismaService } from '../prisma/prisma.service';

type TicketWithRelations = {
  id: string;
  token: string;
  shortCode: string;
  type: string;
  status: string;
  usedAt: Date | null;
  seat: { row: string; number: number };
  screening: {
    venue: string;
    startsAt: Date;
    movie: { title: string; posterUrl: string };
  };
};

type GateTicketWithRelations = TicketWithRelations & {
  order: { client: { name: string | null } };
};

const TICKET_INCLUDE = {
  seat: true,
  screening: {
    include: { movie: { select: { title: true, posterUrl: true } } },
  },
} as const;

const GATE_TICKET_INCLUDE = {
  ...TICKET_INCLUDE,
  order: { include: { client: { select: { name: true } } } },
} as const;

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(clientId: string): Promise<TicketDto[]> {
    const tickets = await this.prisma.ticket.findMany({
      where: { order: { clientId } },
      include: TICKET_INCLUDE,
      orderBy: { screening: { startsAt: 'asc' } },
    });
    return tickets.map((t) => this.toDto(t));
  }

  async getByTokenPublic(token: string): Promise<TicketDto> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { token },
      include: TICKET_INCLUDE,
    });
    if (!ticket) {
      throw new NotFoundException('Ingresso não encontrado.');
    }
    return this.toDto(ticket);
  }

  async validateAtGate(
    code: string,
    gateUserId: string,
  ): Promise<GateCheckResponseDto> {
    const updated = await this.prisma.$queryRaw<{ id: string }[]>`
      UPDATE tickets
         SET status = 'used', used_at = now(), used_by_gate_id = ${gateUserId}
       WHERE (short_code = ${code} OR token = ${code}) AND status = 'valid'
      RETURNING id
    `;

    if (updated.length > 0) {
      const ticket = await this.prisma.ticket.findUniqueOrThrow({
        where: { id: updated[0].id },
        include: GATE_TICKET_INCLUDE,
      });
      return { result: 'valid', ticket: this.toGateDto(ticket) };
    }

    const existing = await this.prisma.ticket.findFirst({
      where: { OR: [{ shortCode: code }, { token: code }] },
      include: GATE_TICKET_INCLUDE,
    });
    if (!existing) {
      return { result: 'invalid' };
    }
    if (existing.status === 'cancelled') {
      return { result: 'cancelled', ticket: this.toGateDto(existing) };
    }
    return { result: 'already_used', ticket: this.toGateDto(existing) };
  }

  private toDto(ticket: TicketWithRelations): TicketDto {
    return {
      id: ticket.id,
      token: ticket.token,
      shortCode: ticket.shortCode,
      type: ticket.type as TicketDto['type'],
      status: ticket.status as TicketDto['status'],
      seat: {
        row: ticket.seat.row,
        number: ticket.seat.number,
      },
      screening: {
        movieTitle: ticket.screening.movie.title,
        moviePosterUrl: ticket.screening.movie.posterUrl,
        venue: ticket.screening.venue,
        startsAt: ticket.screening.startsAt.toISOString(),
      },
      usedAt: ticket.usedAt ? ticket.usedAt.toISOString() : null,
    };
  }

  private toGateDto(ticket: GateTicketWithRelations): GateTicketDto {
    return {
      ...this.toDto(ticket),
      buyerName: ticket.order.client.name ?? 'Comprador sem nome cadastrado',
    };
  }
}
