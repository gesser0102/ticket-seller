import type { GateTicketDto, TicketDto } from '@ticket-seller/shared';

export type TicketWithDtoRelations = {
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

export type GateTicketWithDtoRelations = TicketWithDtoRelations & {
  order: { client: { name: string | null } };
};

export function ticketToDto(ticket: TicketWithDtoRelations): TicketDto {
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

export function gateTicketToDto(
  ticket: GateTicketWithDtoRelations,
): GateTicketDto {
  return {
    ...ticketToDto(ticket),
    buyerName: ticket.order.client.name ?? 'Comprador sem nome cadastrado',
  };
}
