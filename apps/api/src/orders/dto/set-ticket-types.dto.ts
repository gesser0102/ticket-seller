import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import type { TicketType } from '@ticket-seller/shared';

class TicketTypeItemDto {
  @IsUUID(4)
  seatId!: string;

  @IsIn(['inteira', 'meia'])
  type!: TicketType;
}

export class SetTicketTypesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TicketTypeItemDto)
  items!: TicketTypeItemDto[];
}
