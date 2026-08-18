export type Role = "organizer" | "client" | "gate";

export type ScreeningStatus = "draft" | "published" | "cancelled";
export type SeatStatus = "available" | "held" | "sold";
export type OrderStatus = "hold" | "paid" | "cancelled";
export type TicketType = "inteira" | "meia";
export type TicketStatus = "valid" | "used" | "cancelled";
export type PaymentStatus = "approved" | "declined";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  redirectUrl?: string;
}

export interface SessionUserDto {
  id: string;
  email: string | null;
  name: string | null;
  role: Role;
  registered: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  cpf: string;
  phone: string;
  birthDate: string;
}

export interface UserProfileDto {
  id: string;
  name: string | null;
  email: string | null;
  cpf: string | null;
  phone: string | null;
  birthDate: string | null;
  role: Role;
}

export interface UpdateProfileRequest {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  birthDate: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface CastMemberDto {
  name: string;
  character: string;
  profileUrl: string | null;
}

export interface MovieSummaryDto {
  id: string;
  title: string;
  posterUrl: string;
  backdropUrl: string | null;
  synopsis: string;
  genres: string[];
  runtimeMinutes: number | null;
  certification: string | null;
}

export interface MoviePageDto {
  items: MovieSummaryDto[];
  page: number;
  hasMore: boolean;
}

export interface MovieDetailDto extends MovieSummaryDto {
  cast: CastMemberDto[];
  screenings: ScreeningSummaryDto[];
}

export interface TmdbSearchResultDto {
  externalRef: string;
  title: string;
  posterUrl: string | null;
  releaseYear: string | null;
  overview: string;
}

export interface TmdbSearchResponseDto {
  results: TmdbSearchResultDto[];
  page: number;
  totalPages: number;
}

export interface CreateMovieRequest {
  externalRef: string;
}

export interface RoomDto {
  id: string;
  name: string;
  priceCents: number;
}

export interface CreateRoomRequest {
  name: string;
  priceCents: number;
}

export interface ScreeningSlot {
  date: string;
  time: string;
}

export interface CreateScreeningsBatchRequest {
  venue: string;
  priceCents: number;
  slots: ScreeningSlot[];
}

export interface UpdateScreeningRequest {
  venue?: string;
  startsAt?: string;
  priceCents?: number;
}

export interface OrganizerMovieDto {
  id: string;
  externalRef: string;
  title: string;
  posterUrl: string;
  screenings: ScreeningSummaryDto[];
}

export interface OrganizerScreeningDto extends ScreeningSummaryDto {
  movieTitle: string;
}

export interface OrganizerOverviewDto {
  movieCount: number;
  screeningCount: number;
  upcomingScreenings: OrganizerScreeningDto[];
}

export interface ScreeningSummaryDto {
  id: string;
  movieId: string;
  venue: string;
  startsAt: string;
  priceCents: number;
  status: ScreeningStatus;
}

export interface ScreeningDetailDto extends ScreeningSummaryDto {
  movieTitle: string;
  moviePosterUrl: string;
}

export interface SeatDto {
  id: string;
  row: string;
  number: number;
  status: SeatStatus;
  heldByMe: boolean;
  ticketType: TicketType | null;
}

export interface OrderDto {
  id: string;
  screeningId: string;
  status: OrderStatus;
  totalCents: number;
  holdExpires: string | null;
}

export interface SetTicketTypesPayload {
  items: { seatId: string; type: TicketType }[];
}

export interface PaymentResultDto {
  status: PaymentStatus;
  order: OrderDto;
  tickets?: TicketDto[];
}

export interface TicketDto {
  id: string;
  token: string;
  shortCode: string;
  type: TicketType;
  status: TicketStatus;
  seat: Pick<SeatDto, "row" | "number">;
  screening: {
    movieTitle: string;
    moviePosterUrl: string;
    venue: string;
    startsAt: string;
  };
  usedAt: string | null;
}

export const REALTIME_EVENTS = {
  SEAT_HELD: "seat.held",
  SEAT_RELEASED: "seat.released",
  SEAT_SOLD: "seat.sold",
} as const;

export interface SeatHeldPayload {
  seatId: string;
  until: string;
}

export interface SeatReleasedPayload {
  seatId: string;
}

export interface SeatSoldPayload {
  seatId: string;
}

export type GateCheckResult = "valid" | "already_used" | "invalid" | "cancelled";

export interface GateTicketDto extends TicketDto {
  buyerName: string;
}

export interface GateCheckResponseDto {
  result: GateCheckResult;
  ticket?: GateTicketDto;
}
