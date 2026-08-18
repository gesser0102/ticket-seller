import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  Matches,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class ScreeningSlotDto {
  @IsDateString()
  date!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Horário deve estar no formato HH:mm.',
  })
  time!: string;
}

export class CreateScreeningsBatchDto {
  @MinLength(1)
  venue!: string;

  @IsInt()
  @Min(1)
  priceCents!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScreeningSlotDto)
  slots!: ScreeningSlotDto[];
}
