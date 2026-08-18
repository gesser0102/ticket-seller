import { Matches } from 'class-validator';

const CODE_PATTERN = /^[A-Za-z0-9_-]{3,64}$/;

export class GateValidateDto {
  @Matches(CODE_PATTERN, {
    message: 'Código em formato inválido.',
  })
  code!: string;
}
