import {
  IsDateString,
  IsInt,
  IsOptional,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateScreeningDto {
  @IsOptional()
  @MinLength(1)
  venue?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  priceCents?: number;
}
