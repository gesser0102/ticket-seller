import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateScreeningsBatchRequest,
  OrganizerMovieDto,
  OrganizerOverviewDto,
  OrganizerScreeningDto,
  RoomDto,
  ScreeningSummaryDto,
  TmdbSearchResponseDto,
  UpdateScreeningRequest,
} from '@ticket-seller/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TmdbService } from '../tmdb/tmdb.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { isUniqueConstraintError } from '../common/utils/prisma-error.util';

const SCREENING_ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const SEATS_PER_ROW = 15;

const MAX_SCREENINGS_PER_BATCH = 60;

const UPCOMING_LIMIT = 8;

interface MovieWithScreenings {
  id: string;
  externalRef: string;
  title: string;
  posterUrl: string;
  screenings: {
    id: string;
    movieId: string;
    venue: string;
    startsAt: Date;
    priceCents: number;
    status: string;
  }[];
}

@Injectable()
export class OrganizerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tmdb: TmdbService,
    private readonly realtime: RealtimeGateway,
  ) {}

  searchTmdb(query?: string, page?: number): Promise<TmdbSearchResponseDto> {
    return this.tmdb.searchMovies(query, page);
  }

  async listMine(organizerId: string): Promise<OrganizerMovieDto[]> {
    const movies = await this.prisma.movie.findMany({
      where: { organizerId },
      include: { screenings: { orderBy: { startsAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return movies.map(toDto);
  }

  async listRooms(organizerId: string): Promise<RoomDto[]> {
    const rooms = await this.prisma.room.findMany({
      where: { organizerId },
      orderBy: { name: 'asc' },
    });
    return rooms.map(toRoomDto);
  }

  async createRoom(
    organizerId: string,
    name: string,
    priceCents: number,
  ): Promise<RoomDto> {
    try {
      const room = await this.prisma.room.create({
        data: { organizerId, name: name.trim(), priceCents },
      });
      return toRoomDto(room);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Você já tem uma sala com esse nome.');
      }
      throw error;
    }
  }

  async getOverview(organizerId: string): Promise<OrganizerOverviewDto> {
    const [movieCount, screeningCount, upcoming] = await Promise.all([
      this.prisma.movie.count({ where: { organizerId } }),
      this.prisma.screening.count({
        where: { movie: { organizerId }, status: 'published' },
      }),
      this.prisma.screening.findMany({
        where: {
          movie: { organizerId },
          status: 'published',
          startsAt: { gte: new Date() },
        },
        include: { movie: { select: { title: true } } },
        orderBy: { startsAt: 'asc' },
        take: UPCOMING_LIMIT,
      }),
    ]);

    return {
      movieCount,
      screeningCount,
      upcomingScreenings: upcoming.map((s) =>
        toOrganizerScreeningDto(s, s.movie.title),
      ),
    };
  }

  async listAllScreenings(
    organizerId: string,
  ): Promise<OrganizerScreeningDto[]> {
    const screenings = await this.prisma.screening.findMany({
      where: { movie: { organizerId } },
      include: { movie: { select: { title: true } } },
      orderBy: { startsAt: 'asc' },
    });
    return screenings.map((s) => toOrganizerScreeningDto(s, s.movie.title));
  }

  async createMovie(
    organizerId: string,
    externalRef: string,
  ): Promise<OrganizerMovieDto> {
    const existing = await this.prisma.movie.findUnique({
      where: { organizerId_externalRef: { organizerId, externalRef } },
      include: { screenings: { orderBy: { startsAt: 'asc' } } },
    });
    if (existing) {
      return toDto(existing);
    }

    const snapshot = await this.tmdb.getMovieSnapshot(externalRef);
    if (!snapshot) {
      throw new BadRequestException(
        'Não foi possível buscar esse filme na TMDb.',
      );
    }

    const movie = await this.prisma.movie.create({
      data: {
        organizerId,
        source: 'tmdb',
        externalRef,
        title: snapshot.title,
        posterUrl: snapshot.posterUrl,
        backdropUrl: snapshot.backdropUrl,
        synopsis: snapshot.synopsis,
      },
    });
    return toDto({ ...movie, screenings: [] });
  }

  async createScreeningsBatch(
    organizerId: string,
    movieId: string,
    payload: CreateScreeningsBatchRequest,
  ): Promise<ScreeningSummaryDto[]> {
    const movie = await this.prisma.movie.findUnique({
      where: { id: movieId },
    });
    if (!movie) {
      throw new NotFoundException('Filme não encontrado.');
    }
    if (movie.organizerId !== organizerId) {
      throw new ForbiddenException('Este filme não pertence a você.');
    }

    const startsAtList = payload.slots.map(
      (slot) => new Date(`${slot.date}T${slot.time}:00`),
    );
    if (startsAtList.some((d) => Number.isNaN(d.getTime()))) {
      throw new BadRequestException('Data ou horário inválido.');
    }
    if (startsAtList.length > MAX_SCREENINGS_PER_BATCH) {
      throw new BadRequestException(
        `Isso geraria ${startsAtList.length} sessões de uma vez — o máximo por lote é ${MAX_SCREENINGS_PER_BATCH}. Publique em lotes menores.`,
      );
    }

    const screenings = await this.prisma.$transaction(async (tx) => {
      const created: {
        id: string;
        movieId: string;
        venue: string;
        startsAt: Date;
        priceCents: number;
        status: string;
      }[] = [];
      for (const startsAt of startsAtList) {
        const screening = await tx.screening.create({
          data: {
            movieId,
            venue: payload.venue,
            startsAt,
            priceCents: payload.priceCents,
            status: 'published',
          },
        });
        await tx.seat.createMany({
          data: SCREENING_ROWS.flatMap((row) =>
            Array.from({ length: SEATS_PER_ROW }, (_, i) => ({
              screeningId: screening.id,
              row,
              number: i + 1,
            })),
          ),
        });
        created.push(screening);
      }
      return created;
    });

    return screenings.map(toScreeningSummary);
  }

  async updateScreening(
    organizerId: string,
    screeningId: string,
    payload: UpdateScreeningRequest,
  ): Promise<ScreeningSummaryDto> {
    const screening = await this.findOwnedScreening(organizerId, screeningId);

    const startsAt = payload.startsAt ? new Date(payload.startsAt) : undefined;
    if (startsAt && Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('Data ou horário inválido.');
    }

    const updated = await this.prisma.screening.update({
      where: { id: screening.id },
      data: {
        ...(payload.venue !== undefined ? { venue: payload.venue } : {}),
        ...(startsAt ? { startsAt } : {}),
        ...(payload.priceCents !== undefined
          ? { priceCents: payload.priceCents }
          : {}),
      },
    });
    return toScreeningSummary(updated);
  }

  async deleteScreening(
    organizerId: string,
    screeningId: string,
  ): Promise<void> {
    const screening = await this.findOwnedScreening(organizerId, screeningId);

    const [ticketCount, orderCount] = await Promise.all([
      this.prisma.ticket.count({ where: { screeningId: screening.id } }),
      this.prisma.order.count({ where: { screeningId: screening.id } }),
    ]);
    if (ticketCount > 0 || orderCount > 0) {
      throw new ConflictException(
        'Esta sessão já tem reserva ou ingresso emitido — não pode ser excluída.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.seat.deleteMany({ where: { screeningId: screening.id } }),
      this.prisma.screening.delete({ where: { id: screening.id } }),
    ]);
  }

  async cancelScreening(
    organizerId: string,
    screeningId: string,
  ): Promise<ScreeningSummaryDto> {
    const screening = await this.findOwnedScreening(organizerId, screeningId);
    if (screening.status === 'cancelled') {
      throw new ConflictException('Esta sessão já está cancelada.');
    }

    const { updated, releasedSeatIds } = await this.prisma.$transaction(
      async (tx) => {
        const updated = await tx.screening.update({
          where: { id: screening.id },
          data: { status: 'cancelled' },
        });
        await tx.order.updateMany({
          where: {
            screeningId: screening.id,
            status: { in: ['hold', 'paid'] },
          },
          data: { status: 'cancelled', holdExpires: null },
        });
        await tx.ticket.updateMany({
          where: { screeningId: screening.id, status: 'valid' },
          data: { status: 'cancelled' },
        });
        const releasedSeats = await tx.seat.findMany({
          where: { screeningId: screening.id },
          select: { id: true },
        });
        await tx.seat.updateMany({
          where: { screeningId: screening.id },
          data: {
            status: 'available',
            heldBy: null,
            holdExpires: null,
            orderId: null,
            ticketType: null,
          },
        });
        return { updated, releasedSeatIds: releasedSeats.map((s) => s.id) };
      },
    );

    for (const seatId of releasedSeatIds) {
      this.realtime.broadcastSeatReleased(screening.id, { seatId });
    }

    return toScreeningSummary(updated);
  }

  private async findOwnedScreening(organizerId: string, screeningId: string) {
    const screening = await this.prisma.screening.findUnique({
      where: { id: screeningId },
      include: { movie: { select: { organizerId: true } } },
    });
    if (!screening) {
      throw new NotFoundException('Sessão não encontrada.');
    }
    if (screening.movie.organizerId !== organizerId) {
      throw new ForbiddenException('Esta sessão não pertence a você.');
    }
    return screening;
  }
}

function toDto(movie: MovieWithScreenings): OrganizerMovieDto {
  return {
    id: movie.id,
    externalRef: movie.externalRef,
    title: movie.title,
    posterUrl: movie.posterUrl,
    screenings: movie.screenings.map(toScreeningSummary),
  };
}

function toScreeningSummary(screening: {
  id: string;
  movieId: string;
  venue: string;
  startsAt: Date;
  priceCents: number;
  status: string;
}): ScreeningSummaryDto {
  return {
    id: screening.id,
    movieId: screening.movieId,
    venue: screening.venue,
    startsAt: screening.startsAt.toISOString(),
    priceCents: screening.priceCents,
    status: screening.status as ScreeningSummaryDto['status'],
  };
}

function toRoomDto(room: {
  id: string;
  name: string;
  priceCents: number;
}): RoomDto {
  return { id: room.id, name: room.name, priceCents: room.priceCents };
}

function toOrganizerScreeningDto(
  screening: {
    id: string;
    movieId: string;
    venue: string;
    startsAt: Date;
    priceCents: number;
    status: string;
  },
  movieTitle: string,
): OrganizerScreeningDto {
  return { ...toScreeningSummary(screening), movieTitle };
}
