import { Logger as Log } from "tslog";
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { existsSync, mkdirSync } from 'fs';
import { ILoggingConfig } from '../interfaces/ISettings';
import { join } from 'path';
void Log;
// log.silly("I am a silly log.");
// log.trace("I am a trace log.");
// log.debug("I am a debug log.");
// log.info("I am an info log.");
// log.warn("I am a warn log with a json object:", { foo: "bar" });
// log.error("I am an error log.");
// log.fatal(new Error("I am a pretty Error with a stacktrace."));
export interface ILogger {
  info(message: string, service?: string): void;
  warn(message: string, service?: string): void;
  error(message: string, error?: Error, service?: string): void;
  debug(message: string, service?: string): void;
  log(level: string, message: string, service?: string): void;
}
export interface ILoggerFactory {
  createLogger(config: ILoggingConfig): ILogger;
}
export class Logger implements ILogger {
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
    if (config.file.enable) {
      const logPath = join(process.cwd(), config.file.path);
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
  public log(level: string, message: string, service?: string): void {
    this.logger.log(level, message, { service });
  }
  public verbose(message: string, service?: string): void {
    this.logger.verbose(message, { service });
  }
  public setLevel(level: string, service?: string): void {
    if (service) {
      this.logger.child({ service }).level = level;
    } else {
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
export class LoggerFactory implements ILoggerFactory {
  public createLogger(config: ILoggingConfig): ILogger {
    return Logger.getInstance(config);
  }
}
export const logger = {
  info: (message: string, service?: string) => Logger.getInstance().info(message, service),
  warn: (message: string, service?: string) => Logger.getInstance().warn(message, service),
  error: (message: string, error?: Error, service?: string) => Logger.getInstance().error(message, error, service),
  debug: (message: string, service?: string) => Logger.getInstance().debug(message, service),
  log: (level: string, message: string, service?: string) => Logger.getInstance().log(level, message, service),
  verbose: (message: string, service?: string) => Logger.getInstance().verbose(message, service),
  setLevel: (level: string, service?: string) => Logger.getInstance().setLevel(level, service),
  child: (service: string) => Logger.getInstance().child(service),
};
