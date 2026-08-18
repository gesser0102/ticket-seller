import { Injectable } from '@nestjs/common';
import type {
  CastMemberDto,
  TmdbSearchResponseDto,
} from '@ticket-seller/shared';
import { AppLoggerService } from '../common/logger/app-logger.service';

export interface TmdbMovieData {
  genres: string[];
  runtimeMinutes: number | null;
  certification: string | null;
  cast: CastMemberDto[];
}

interface CacheEntry {
  data: TmdbMovieData;
  expiresAt: number;
}

interface TmdbCastMember {
  name: string;
  character: string;
  profile_path: string | null;
}

interface TmdbReleaseDatesResponse {
  results?: {
    iso_3166_1: string;
    release_dates: { certification: string }[];
  }[];
}

interface TmdbMovieResponse {
  genres?: { name: string }[];
  runtime?: number | null;
  credits?: { cast?: TmdbCastMember[] };
  release_dates?: TmdbReleaseDatesResponse;
}

interface TmdbSearchItem {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string | null;
  overview: string;
}

interface TmdbSearchResponse {
  results?: TmdbSearchItem[];
  page?: number;
  total_pages?: number;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CAST_MEMBERS = 8;
const EMPTY: TmdbMovieData = {
  genres: [],
  runtimeMinutes: null,
  certification: null,
  cast: [],
};

@Injectable()
export class TmdbService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly logger: AppLoggerService) {}

  async getMovieData(externalRef: string): Promise<TmdbMovieData> {
    const cached = this.cache.get(externalRef);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      this.logger.warn({
        module: 'TmdbService',
        procedure: 'getMovieData',
        message: 'TMDB_API_KEY não configurada — dados de TMDb omitidos.',
      });
      return EMPTY;
    }

    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${externalRef}?language=pt-BR&append_to_response=credits,release_dates`,
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );
      if (!response.ok) {
        this.logger.warn({
          module: 'TmdbService',
          procedure: 'getMovieData',
          message: `TMDb respondeu ${response.status} para externalRef=${externalRef}`,
        });
        return EMPTY;
      }

      const body = (await response.json()) as TmdbMovieResponse;

      const cast: CastMemberDto[] = (body.credits?.cast ?? [])
        .slice(0, MAX_CAST_MEMBERS)
        .map((member) => ({
          name: member.name,
          character: member.character,
          profileUrl: member.profile_path
            ? `https://image.tmdb.org/t/p/w185${member.profile_path}`
            : null,
        }));

      const brRelease = body.release_dates?.results?.find(
        (r) => r.iso_3166_1 === 'BR',
      );
      const certification =
        brRelease?.release_dates.find((r) => r.certification)?.certification ||
        null;

      const data: TmdbMovieData = {
        genres: (body.genres ?? []).map((g) => g.name),
        runtimeMinutes: body.runtime ?? null,
        certification,
        cast,
      };

      this.cache.set(externalRef, {
        data,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return data;
    } catch (error) {
      this.logger.warn({
        module: 'TmdbService',
        procedure: 'getMovieData',
        message:
          error instanceof Error
            ? error.message
            : 'Falha ao buscar dados na TMDb.',
      });
      return EMPTY;
    }
  }

  async searchMovies(query?: string, page = 1): Promise<TmdbSearchResponseDto> {
    const EMPTY_PAGE: TmdbSearchResponseDto = {
      results: [],
      page: 1,
      totalPages: 1,
    };
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      this.logger.warn({
        module: 'TmdbService',
        procedure: 'searchMovies',
        message: 'TMDB_API_KEY não configurada — busca de filmes indisponível.',
      });
      return EMPTY_PAGE;
    }

    const url = query
      ? `https://api.themoviedb.org/3/search/movie?language=pt-BR&query=${encodeURIComponent(query)}&page=${page}`
      : `https://api.themoviedb.org/3/movie/now_playing?language=pt-BR&region=BR&page=${page}`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok) {
        this.logger.warn({
          module: 'TmdbService',
          procedure: 'searchMovies',
          message: `TMDb respondeu ${response.status} para busca "${query ?? '(em cartaz)'}"`,
        });
        return EMPTY_PAGE;
      }

      const body = (await response.json()) as TmdbSearchResponse;
      return {
        results: (body.results ?? []).map((item) => ({
          externalRef: String(item.id),
          title: item.title,
          posterUrl: item.poster_path
            ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
            : null,
          releaseYear: item.release_date ? item.release_date.slice(0, 4) : null,
          overview: item.overview,
        })),
        page: body.page ?? page,
        totalPages: body.total_pages ?? 1,
      };
    } catch (error) {
      this.logger.warn({
        module: 'TmdbService',
        procedure: 'searchMovies',
        message:
          error instanceof Error
            ? error.message
            : 'Falha ao buscar filmes na TMDb.',
      });
      return EMPTY_PAGE;
    }
  }

  async getMovieSnapshot(externalRef: string): Promise<{
    title: string;
    posterUrl: string;
    backdropUrl: string | null;
    synopsis: string;
  } | null> {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      this.logger.warn({
        module: 'TmdbService',
        procedure: 'getMovieSnapshot',
        message: 'TMDB_API_KEY não configurada — não é possível criar filme.',
      });
      return null;
    }

    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${externalRef}?language=pt-BR`,
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );
      if (!response.ok) {
        this.logger.warn({
          module: 'TmdbService',
          procedure: 'getMovieSnapshot',
          message: `TMDb respondeu ${response.status} para externalRef=${externalRef}`,
        });
        return null;
      }
      const body = (await response.json()) as {
        title?: string;
        poster_path?: string | null;
        backdrop_path?: string | null;
        overview?: string;
      };
      if (!body.title) return null;
      return {
        title: body.title,
        posterUrl: body.poster_path
          ? `https://image.tmdb.org/t/p/w500${body.poster_path}`
          : '',
        backdropUrl: body.backdrop_path
          ? `https://image.tmdb.org/t/p/w1280${body.backdrop_path}`
          : null,
        synopsis: body.overview ?? '',
      };
    } catch (error) {
      this.logger.warn({
        module: 'TmdbService',
        procedure: 'getMovieSnapshot',
        message:
          error instanceof Error
            ? error.message
            : 'Falha ao buscar filme na TMDb.',
      });
      return null;
    }
  }
}
