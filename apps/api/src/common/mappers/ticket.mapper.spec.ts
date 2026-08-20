import {
  gateTicketToDto,
  ticketToDto,
  type TicketWithDtoRelations,
} from './ticket.mapper';

const ticket = {
  id: 'ticket-1',
  token: 'token-1',
  shortCode: 'ABCD12',
  type: 'meia',
  status: 'valid',
  usedAt: new Date('2026-08-20T18:45:00.000Z'),
  seat: { row: 'C', number: 7 },
  screening: {
    venue: 'Sala Atmos',
    startsAt: new Date('2026-08-21T23:30:00.000Z'),
    movie: {
      title: 'Noite de Estreia',
      posterUrl: 'https://example.com/poster.jpg',
    },
  },
} satisfies TicketWithDtoRelations;

describe('ticket mapper', () => {
  it('maps a ticket with nested seat and screening data to the shared DTO', () => {
    expect(ticketToDto(ticket)).toEqual({
      id: 'ticket-1',
      token: 'token-1',
      shortCode: 'ABCD12',
      type: 'meia',
      status: 'valid',
      seat: { row: 'C', number: 7 },
      screening: {
        movieTitle: 'Noite de Estreia',
        moviePosterUrl: 'https://example.com/poster.jpg',
        venue: 'Sala Atmos',
        startsAt: '2026-08-21T23:30:00.000Z',
      },
      usedAt: '2026-08-20T18:45:00.000Z',
    });
  });

  it('adds buyer name for gate validation tickets', () => {
    expect(
      gateTicketToDto({
        ...ticket,
        usedAt: null,
        order: { client: { name: null } },
      }).buyerName,
    ).toBe('Comprador sem nome cadastrado');
  });
});
