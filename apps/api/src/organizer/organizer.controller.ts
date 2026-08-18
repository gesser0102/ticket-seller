import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  OrganizerMovieDto,
  OrganizerOverviewDto,
  OrganizerScreeningDto,
  RoomDto,
  ScreeningSummaryDto,
  SessionUserDto,
  TmdbSearchResponseDto,
} from '@ticket-seller/shared';
import { ApiResult } from '../common/http/api-result';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SessionAuthGuard } from '../common/guards/session-auth.guard';
import { CreateMovieDto } from './dto/create-movie.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { CreateScreeningsBatchDto } from './dto/create-screenings-batch.dto';
import { UpdateScreeningDto } from './dto/update-screening.dto';
import { OrganizerService } from './organizer.service';

@Controller('organizer')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('organizer')
export class OrganizerController {
  constructor(private readonly organizerService: OrganizerService) {}

  @Get('tmdb/search')
  async searchTmdb(
    @Query('query') query?: string,
    @Query('page') page?: string,
  ): Promise<ApiResult<TmdbSearchResponseDto>> {
    const parsedPage = page ? Number.parseInt(page, 10) : undefined;
    const results = await this.organizerService.searchTmdb(
      query,
      parsedPage && parsedPage > 0 ? parsedPage : undefined,
    );
    return new ApiResult(results);
  }

  @Get('overview')
  async getOverview(
    @CurrentUser() user: SessionUserDto,
  ): Promise<ApiResult<OrganizerOverviewDto>> {
    const overview = await this.organizerService.getOverview(user.id);
    return new ApiResult(overview);
  }

  @Get('movies')
  async listMine(
    @CurrentUser() user: SessionUserDto,
  ): Promise<ApiResult<OrganizerMovieDto[]>> {
    const movies = await this.organizerService.listMine(user.id);
    return new ApiResult(movies);
  }

  @Get('screenings')
  async listAllScreenings(
    @CurrentUser() user: SessionUserDto,
  ): Promise<ApiResult<OrganizerScreeningDto[]>> {
    const screenings = await this.organizerService.listAllScreenings(user.id);
    return new ApiResult(screenings);
  }

  @Get('rooms')
  async listRooms(
    @CurrentUser() user: SessionUserDto,
  ): Promise<ApiResult<RoomDto[]>> {
    const rooms = await this.organizerService.listRooms(user.id);
    return new ApiResult(rooms);
  }

  @Post('rooms')
  async createRoom(
    @Body() dto: CreateRoomDto,
    @CurrentUser() user: SessionUserDto,
  ): Promise<ApiResult<RoomDto>> {
    const room = await this.organizerService.createRoom(
      user.id,
      dto.name,
      dto.priceCents,
    );
    return new ApiResult(room, 'Sala cadastrada.');
  }

  @Post('movies')
  async createMovie(
    @Body() dto: CreateMovieDto,
    @CurrentUser() user: SessionUserDto,
  ): Promise<ApiResult<OrganizerMovieDto>> {
    const movie = await this.organizerService.createMovie(
      user.id,
      dto.externalRef,
    );
    return new ApiResult(movie, 'Filme adicionado.');
  }

  @Post('movies/:movieId/screenings')
  async createScreeningsBatch(
    @Param('movieId') movieId: string,
    @Body() dto: CreateScreeningsBatchDto,
    @CurrentUser() user: SessionUserDto,
  ): Promise<ApiResult<ScreeningSummaryDto[]>> {
    const screenings = await this.organizerService.createScreeningsBatch(
      user.id,
      movieId,
      dto,
    );
    const label =
      screenings.length === 1
        ? 'Sessão publicada.'
        : `${screenings.length} sessões publicadas.`;
    return new ApiResult(screenings, label);
  }

  @Patch('screenings/:id')
  async updateScreening(
    @Param('id') id: string,
    @Body() dto: UpdateScreeningDto,
    @CurrentUser() user: SessionUserDto,
  ): Promise<ApiResult<ScreeningSummaryDto>> {
    const screening = await this.organizerService.updateScreening(
      user.id,
      id,
      dto,
    );
    return new ApiResult(screening, 'Sessão atualizada.');
  }

  @Delete('screenings/:id')
  async deleteScreening(
    @Param('id') id: string,
    @CurrentUser() user: SessionUserDto,
  ): Promise<ApiResult<null>> {
    await this.organizerService.deleteScreening(user.id, id);
    return new ApiResult(null, 'Sessão excluída.');
  }

  @Post('screenings/:id/cancel')
  async cancelScreening(
    @Param('id') id: string,
    @CurrentUser() user: SessionUserDto,
  ): Promise<ApiResult<ScreeningSummaryDto>> {
    const screening = await this.organizerService.cancelScreening(user.id, id);
    return new ApiResult(
      screening,
      'Sessão cancelada. Assentos liberados e pedidos/ingressos vinculados foram cancelados.',
    );
  }
}
