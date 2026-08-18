import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsUUID(4)
  screeningId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(4, { each: true })
  seatIds!: string[];
}
