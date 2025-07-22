/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

import { ILogger } from './Logger';
import { AudioException } from '../audio/Exceptions';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface IErrorContext {
  userId?: string;
  guildId?: string;
  channelId?: string;
  commandName?: string;
  timestamp: number;
  severity: ErrorSeverity;
}

export class ErrorHandler {
  private logger: ILogger;
  private errorCounts = new Map<string, number>();
  private readonly maxErrorsPerMinute = 10;

  constructor(logger: ILogger) {
    this.logger = logger;
    this.setupGlobalHandlers();
  }

  public handleError(error: Error, context: IErrorContext): void {
    const errorKey = this.generateErrorKey(error, context);
    
    if (this.isRateLimited(errorKey)) {
      return;
    }

    this.logError(error, context);
    this.incrementErrorCount(errorKey);
    this.notifyIfCritical(error, context);
  }

  public handleAudioError(error: AudioException, context: IErrorContext): void {
    const enhancedContext = {
      ...context,
      errorCode: error.code,
      severity: this.determineAudioErrorSeverity(error),
    };

    this.handleError(error, enhancedContext);
  }

  public handleCommandError(error: Error, context: IErrorContext): string {
    this.handleError(error, {
      ...context,
      severity: ErrorSeverity.MEDIUM,
    });

    return this.generateUserFriendlyMessage(error);
  }

  public handleDatabaseError(error: Error, context: IErrorContext): void {
    this.handleError(error, {
      ...context,
      severity: ErrorSeverity.HIGH,
    });
  }

  public handleNetworkError(error: Error, context: IErrorContext): void {
    this.handleError(error, {
      ...context,
      severity: ErrorSeverity.MEDIUM,
    });
  }

  private setupGlobalHandlers(): void {
    process.on('uncaughtException', (error) => {
      this.handleError(error, {
        timestamp: Date.now(),
        severity: ErrorSeverity.CRITICAL,
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.handleError(error, {
        timestamp: Date.now(),
        severity: ErrorSeverity.HIGH,
      });
    });
  }

  private generateErrorKey(error: Error, context: IErrorContext): string {
    return `${error.name}:${context.guildId || 'global'}:${Math.floor(Date.now() / 60000)}`;
  }

  private isRateLimited(errorKey: string): boolean {
    const count = this.errorCounts.get(errorKey) || 0;
    return count >= this.maxErrorsPerMinute;
  }

  private incrementErrorCount(errorKey: string): void {
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);

    setTimeout(() => {
      this.errorCounts.delete(errorKey);
    }, 60000);
  }

  private logError(error: Error, context: IErrorContext): void {
    switch (context.severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error(`CRITICAL ERROR: ${error.message}`, error, 'error-handler');
        break;
      case ErrorSeverity.HIGH:
        this.logger.error(`HIGH SEVERITY: ${error.message}`, error, 'error-handler');
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn(`MEDIUM SEVERITY: ${error.message}`, 'error-handler');
        break;
      case ErrorSeverity.LOW:
        this.logger.debug(`LOW SEVERITY: ${error.message}`, 'error-handler');
        break;
    }
  }

  private determineAudioErrorSeverity(error: AudioException): ErrorSeverity {
    switch (error.code) {
      case 'NODE_CONNECTION_FAILED':
      case 'NODE_NOT_AVAILABLE':
        return ErrorSeverity.HIGH;
      case 'PLAYER_NOT_CONNECTED':
      case 'INVALID_CHANNEL_PERMISSIONS':
        return ErrorSeverity.MEDIUM;
      case 'QUEUE_FULL':
      case 'TRACK_LOAD_FAILED':
        return ErrorSeverity.LOW;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  private generateUserFriendlyMessage(error: Error): string {
    if (error instanceof AudioException) {
      switch (error.code) {
        case 'PLAYER_NOT_CONNECTED':
          return '❌ I\'m not connected to a voice channel.';
        case 'INVALID_CHANNEL_PERMISSIONS':
          return '❌ I don\'t have permission to join that voice channel.';
        case 'QUEUE_FULL':
          return '❌ The queue is full. Please try again later.';
        case 'TRACK_LOAD_FAILED':
          return '❌ Failed to load the track. Please try a different song.';
        case 'NODE_NOT_AVAILABLE':
          return '❌ Music service is temporarily unavailable. Please try again later.';
        default:
          return '❌ An audio error occurred. Please try again.';
      }
    }

    return '❌ An unexpected error occurred. Please try again.';
  }

  private notifyIfCritical(error: Error, context: IErrorContext): void {
    if (context.severity === ErrorSeverity.CRITICAL) {
      this.logger.error('CRITICAL ERROR DETECTED - IMMEDIATE ATTENTION REQUIRED', error, 'error-handler');
    }
  }
}
