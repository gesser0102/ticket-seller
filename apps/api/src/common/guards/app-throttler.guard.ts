import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected getErrorMessage(): Promise<string> {
    return Promise.resolve(
      'Muitas tentativas em pouco tempo. Aguarde um momento e tente novamente.',
    );
  }
}
