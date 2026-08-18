import { IsDateString, IsEmail, Matches, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @Matches(/^\d{11}$/, { message: 'CPF deve ter 11 dígitos.' })
  cpf!: string;

  @Matches(/^\d{10,11}$/, {
    message: 'Celular deve ter 10 ou 11 dígitos (com DDD).',
  })
  phone!: string;

  @IsDateString()
  birthDate!: string;
}
