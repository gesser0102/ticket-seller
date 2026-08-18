import { Controller, Get, Param, Query } from '@nestjs/common';
import type { MovieDetailDto, MoviePageDto } from '@ticket-seller/shared';
import { MoviesService } from './movies.service';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<MoviePageDto> {
    return this.moviesService.listPublished(
      page ? Number.parseInt(page, 10) : undefined,
      limit ? Number.parseInt(limit, 10) : undefined,
    );
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<MovieDetailDto> {
    return this.moviesService.getDetail(id);
  }
}
