import { IsIn, IsOptional, IsString } from 'class-validator';

export class PayDto {
  @IsIn(['pix', 'card'])
  paymentMethod!: 'pix' | 'card';

  @IsOptional()
  @IsString()
  cardNumber?: string;
}
