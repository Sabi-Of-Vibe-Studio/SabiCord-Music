/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ILoggingConfig } from '@interfaces/ISettings';

export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;

  private constructor(config: ILoggingConfig) {
    this.logger = this.createLogger(config);
  }

  public static getInstance(config?: ILoggingConfig): Logger {
    if (!Logger.instance) {
      if (!config) {
        throw new Error('Logger configuration is required for first initialization');
      }
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  private createLogger(config: ILoggingConfig): winston.Logger {
    const transports: winston.transport[] = [];

    // Console transport
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message, service }) => {
            const serviceLabel = service ? `[${service}]` : '';
            return `${timestamp} ${level}${serviceLabel}: ${message}`;
          })
        ),
      })
    );

    // File transport
    if (config.file.enable) {
      const logPath = join(process.cwd(), config.file.path);
      
      // Ensure log directory exists
      if (!existsSync(logPath)) {
        mkdirSync(logPath, { recursive: true });
      }

      transports.push(
        new DailyRotateFile({
          filename: join(logPath, 'vocard-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxFiles: `${config['max-history']}d`,
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, service }) => {
              const serviceLabel = service ? `[${service}.toUpperCase()]` : '';
              return `${timestamp} [${level.toUpperCase()}]${serviceLabel}: ${message}`;
            })
          ),
        })
      );
    }

    return winston.createLogger({
      level: 'info',
      transports,
      exitOnError: false,
    });
  }

  public info(message: string, service?: string): void {
    this.logger.info(message, { service });
  }

  public warn(message: string, service?: string): void {
    this.logger.warn(message, { service });
  }

  public error(message: string, error?: Error, service?: string): void {
    const errorMessage = error ? `${message}: ${error.message}` : message;
    this.logger.error(errorMessage, { service, stack: error?.stack });
  }

  public debug(message: string, service?: string): void {
    this.logger.debug(message, { service });
  }

  public verbose(message: string, service?: string): void {
    this.logger.verbose(message, { service });
  }

  public setLevel(level: string, service?: string): void {
    if (service) {
      // Set level for specific service
      this.logger.child({ service }).level = level;
    } else {
      // Set global level
      this.logger.level = level;
    }
  }

  public child(service: string): winston.Logger {
    return this.logger.child({ service });
  }

  public getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}

// Export a default logger instance that can be configured later
export const logger = {
  info: (message: string, service?: string) => Logger.getInstance().info(message, service),
  warn: (message: string, service?: string) => Logger.getInstance().warn(message, service),
  error: (message: string, error?: Error, service?: string) => Logger.getInstance().error(message, error, service),
  debug: (message: string, service?: string) => Logger.getInstance().debug(message, service),
  verbose: (message: string, service?: string) => Logger.getInstance().verbose(message, service),
  setLevel: (level: string, service?: string) => Logger.getInstance().setLevel(level, service),
  child: (service: string) => Logger.getInstance().child(service),
};
