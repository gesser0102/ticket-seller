import { Controller, Get, Param } from '@nestjs/common';
import type { ScreeningDetailDto } from '@ticket-seller/shared';
import { ScreeningsService } from './screenings.service';

@Controller('screenings')
export class ScreeningsController {
  constructor(private readonly screeningsService: ScreeningsService) {}

  @Get()
  list(): Promise<ScreeningDetailDto[]> {
    return this.screeningsService.listPublished();
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<ScreeningDetailDto> {
    return this.screeningsService.getDetail(id);
  }
}
