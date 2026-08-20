import { Injectable, NotFoundException } from '@nestjs/common';
import type { GateCheckResponseDto, TicketDto } from '@ticket-seller/shared';
import { gateTicketToDto, ticketToDto } from '../common/mappers/ticket.mapper';
import { PrismaService } from '../prisma/prisma.service';

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
    return tickets.map((ticket) => ticketToDto(ticket));
  }

  async getByTokenPublic(token: string): Promise<TicketDto> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { token },
      include: TICKET_INCLUDE,
    });
    if (!ticket) {
      throw new NotFoundException('Ingresso não encontrado.');
    }
    return ticketToDto(ticket);
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
      return { result: 'valid', ticket: gateTicketToDto(ticket) };
    }

    const existing = await this.prisma.ticket.findFirst({
      where: { OR: [{ shortCode: code }, { token: code }] },
      include: GATE_TICKET_INCLUDE,
    });
    if (!existing) {
      return { result: 'invalid' };
    }
    if (existing.status === 'cancelled') {
      return { result: 'cancelled', ticket: gateTicketToDto(existing) };
    }
    return { result: 'already_used', ticket: gateTicketToDto(existing) };
  }
}
