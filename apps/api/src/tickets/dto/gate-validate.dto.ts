import { Matches } from 'class-validator';
import { SHORT_CODE_PATTERN } from '../../common/utils/short-code.util';

export class GateValidateDto {
  @Matches(SHORT_CODE_PATTERN, {
    message: 'Código deve estar no formato XXX-XXX.',
  })
  code!: string;
}
