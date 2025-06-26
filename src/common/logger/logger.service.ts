import {
  Injectable,
  LoggerService as NestLoggerService,
  Logger,
} from '@nestjs/common';

@Injectable()
export class AppLoggerService implements NestLoggerService {
  private readonly logger = new Logger('App');

  log(message: string) {
    this.logger.log(message);
  }

  error(message: string, error?: unknown) {
    const formattedError = this.formatError(error);
    this.logger.error(message, formattedError);
  }

  warn(message: string) {
    this.logger.warn(message);
  }

  debug(message: string) {
    this.logger.debug(message);
  }

  verbose(message: string) {
    this.logger.verbose(message);
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.stack || error.message;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}
