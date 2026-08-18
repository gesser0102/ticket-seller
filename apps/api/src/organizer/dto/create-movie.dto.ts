import { Matches } from 'class-validator';

export class CreateMovieDto {
  @Matches(/^\d+$/, { message: 'externalRef deve ser o id numérico da TMDb.' })
  externalRef!: string;
}
