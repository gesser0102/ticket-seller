import type { SessionUserDto } from '@ticket-seller/shared';

declare module 'express-session' {
  interface SessionData {
    user?: SessionUserDto;
  }
}
