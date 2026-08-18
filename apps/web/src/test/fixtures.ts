import type {
  GateTicketDto,
  MovieDetailDto,
  MovieSummaryDto,
  OrderDto,
  ScreeningDetailDto,
  ScreeningSummaryDto,
  SeatDto,
  SessionUserDto,
  TicketDto,
} from "@ticket-seller/shared";

export function makeUser(overrides: Partial<SessionUserDto> = {}): SessionUserDto {
  return {
    id: "user-1",
    email: "cliente@teste.dev",
    name: "Cliente Teste",
    role: "client",
    registered: true,
    ...overrides,
  };
}

export function makeMovieSummary(overrides: Partial<MovieSummaryDto> = {}): MovieSummaryDto {
  return {
    id: "movie-1",
    title: "Filme Teste",
    posterUrl: "https://example.com/poster.jpg",
    backdropUrl: "https://example.com/backdrop.jpg",
    synopsis: "Sinopse de teste.",
    genres: ["Drama", "Ação"],
    runtimeMinutes: 120,
    certification: "14",
    ...overrides,
  };
}

export function makeMovieDetail(overrides: Partial<MovieDetailDto> = {}): MovieDetailDto {
  return {
    ...makeMovieSummary(),
    cast: [],
    screenings: [],
    ...overrides,
  };
}

export function makeScreeningSummary(overrides: Partial<ScreeningSummaryDto> = {}): ScreeningSummaryDto {
  return {
    id: "screening-1",
    movieId: "movie-1",
    venue: "Sala 1",
    startsAt: "2026-08-20T20:00:00.000Z",
    priceCents: 4500,
    status: "published",
    ...overrides,
  };
}

export function makeScreeningDetail(overrides: Partial<ScreeningDetailDto> = {}): ScreeningDetailDto {
  return {
    ...makeScreeningSummary(),
    movieTitle: "Filme Teste",
    moviePosterUrl: "https://example.com/poster.jpg",
    ...overrides,
  };
}

export function makeSeat(overrides: Partial<SeatDto> = {}): SeatDto {
  return {
    id: "seat-1",
    row: "A",
    number: 1,
    status: "available",
    heldByMe: false,
    ticketType: null,
    ...overrides,
  };
}

export function makeOrder(overrides: Partial<OrderDto> = {}): OrderDto {
  return {
    id: "order-1",
    screeningId: "screening-1",
    status: "hold",
    totalCents: 4500,
    holdExpires: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

export function makeTicket(overrides: Partial<TicketDto> = {}): TicketDto {
  return {
    id: "ticket-1",
    token: "tok_abc123",
    shortCode: "ABC-DEF",
    type: "inteira",
    status: "valid",
    seat: { row: "A", number: 1 },
    screening: {
      movieTitle: "Filme Teste",
      moviePosterUrl: "https://example.com/poster.jpg",
      venue: "Sala 1",
      startsAt: "2026-08-20T20:00:00.000Z",
    },
    usedAt: null,
    ...overrides,
  };
}

export function makeGateTicket(overrides: Partial<GateTicketDto> = {}): GateTicketDto {
  return {
    ...makeTicket(),
    buyerName: "Comprador Teste",
    ...overrides,
  };
}
