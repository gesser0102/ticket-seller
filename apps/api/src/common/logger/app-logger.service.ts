import { Injectable, Logger } from '@nestjs/common';
import { maskSensitive } from '../utils/mask.util';

export interface TechnicalLogEntry {
  userId?: string;
  module: string;
  procedure: string;
  message: string;
  stack?: string;
  params?: unknown;
}

@Injectable()
export class AppLoggerService {
  private readonly logger = new Logger('TicketSeller');

  error(entry: TechnicalLogEntry): void {
    this.logger.error(this.format(entry), entry.stack);
  }

  warn(entry: TechnicalLogEntry): void {
    this.logger.warn(this.format(entry));
  }

  info(entry: Omit<TechnicalLogEntry, 'stack'>): void {
    this.logger.log(this.format(entry));
  }

  private format(entry: TechnicalLogEntry): string {
    const parts = {
      user: entry.userId ?? 'sistema',
      module: entry.module,
      procedure: entry.procedure,
      message: entry.message,
      params: entry.params ? maskSensitive(entry.params) : undefined,
      env: process.env.NODE_ENV ?? 'development',
    };
    return JSON.stringify(parts);
  }
}
