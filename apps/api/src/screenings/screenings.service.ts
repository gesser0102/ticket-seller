import { Injectable, NotFoundException } from '@nestjs/common';
import type { ScreeningDetailDto } from '@ticket-seller/shared';
import { PrismaService } from '../prisma/prisma.service';

const INCLUDE_MOVIE = {
  movie: { select: { title: true, posterUrl: true } },
} as const;

@Injectable()
export class ScreeningsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(): Promise<ScreeningDetailDto[]> {
    const screenings = await this.prisma.screening.findMany({
      where: { status: 'published' },
      include: INCLUDE_MOVIE,
      orderBy: { startsAt: 'asc' },
    });
    return screenings.map((screening) => this.toDto(screening));
  }

  async getDetail(id: string): Promise<ScreeningDetailDto> {
    const screening = await this.prisma.screening.findFirst({
      where: { id, status: 'published' },
      include: INCLUDE_MOVIE,
    });
    if (!screening) {
      throw new NotFoundException('Sessão não encontrada.');
    }
    return this.toDto(screening);
  }

  private toDto(screening: {
    id: string;
    movieId: string;
    venue: string;
    startsAt: Date;
    priceCents: number;
    status: string;
    movie: { title: string; posterUrl: string };
  }): ScreeningDetailDto {
    return {
      id: screening.id,
      movieId: screening.movieId,
      venue: screening.venue,
      startsAt: screening.startsAt.toISOString(),
      priceCents: screening.priceCents,
      status: screening.status as ScreeningDetailDto['status'],
      movieTitle: screening.movie.title,
      moviePosterUrl: screening.movie.posterUrl,
    };
  }
}
