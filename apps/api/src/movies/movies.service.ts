import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  MovieDetailDto,
  MoviePageDto,
  MovieSummaryDto,
  ScreeningSummaryDto,
} from '@ticket-seller/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TmdbService, type TmdbMovieData } from '../tmdb/tmdb.service';

interface MovieRow {
  id: string;
  title: string;
  posterUrl: string;
  backdropUrl: string | null;
  synopsis: string;
  externalRef: string;
}

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

@Injectable()
export class MoviesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tmdb: TmdbService,
  ) {}

  async listPublished(
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
  ): Promise<MoviePageDto> {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit =
      Number.isFinite(limit) && limit > 0
        ? Math.min(Math.floor(limit), MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE;

    const movies = await this.prisma.movie.findMany({
      where: { screenings: { some: { status: 'published' } } },
      orderBy: { createdAt: 'asc' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit + 1,
    });

    const hasMore = movies.length > safeLimit;
    const pageMovies = hasMore ? movies.slice(0, safeLimit) : movies;

    return {
      items: await Promise.all(
        pageMovies.map((movie) => this.toSummary(movie)),
      ),
      page: safePage,
      hasMore,
    };
  }

  async getDetail(id: string): Promise<MovieDetailDto> {
    const movie = await this.prisma.movie.findUnique({ where: { id } });
    if (!movie) {
      throw new NotFoundException('Filme não encontrado.');
    }

    const screenings = await this.prisma.screening.findMany({
      where: {
        movieId: id,
        status: 'published',
        startsAt: { gte: new Date() },
      },
      orderBy: { startsAt: 'asc' },
    });

    const tmdbData = await this.tmdb.getMovieData(movie.externalRef);
    return {
      ...(await this.toSummary(movie, tmdbData)),
      cast: tmdbData.cast,
      screenings: screenings.map(toScreeningSummary),
    };
  }

  private async toSummary(
    movie: MovieRow,
    preloaded?: TmdbMovieData,
  ): Promise<MovieSummaryDto> {
    const tmdbData =
      preloaded ?? (await this.tmdb.getMovieData(movie.externalRef));
    return {
      id: movie.id,
      title: movie.title,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
      synopsis: movie.synopsis,
      genres: tmdbData.genres,
      runtimeMinutes: tmdbData.runtimeMinutes,
      certification: tmdbData.certification,
    };
  }
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
