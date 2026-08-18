import { Global, Module } from '@nestjs/common';
import { AppLoggerService } from './logger/app-logger.service';
import { IdentityService } from './identity/identity.service';

@Global()
@Module({
  providers: [AppLoggerService, IdentityService],
  exports: [AppLoggerService, IdentityService],
})
export class CommonModule {}
