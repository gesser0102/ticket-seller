import { IsInt, Min, MinLength } from 'class-validator';

export class CreateRoomDto {
  @MinLength(1)
  name!: string;

  @IsInt()
  @Min(1)
  priceCents!: number;
}
