/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import { Database } from '../core/Database';
import { IDatabaseConfig } from '../interfaces/ISettings';
import { IDatabaseConnection, IGuildSettingsRepository, IUserRepository } from '../interfaces/IDatabase';
import { ILogger } from '../core/Logger';
export class DatabaseService {
  private database: Database;
  private logger: ILogger;
  constructor(config: IDatabaseConfig, logger: ILogger) {
    this.database = new Database(config.mongodb_url, config.mongodb_name);
    this.logger = logger;
  }
  public async initialize(): Promise<void> {
    try {
      await this.database.initialize();
      this.logger.info('Database service initialized successfully', 'database');
    } catch (error) {
      this.logger.error('Failed to initialize database service', error as Error, 'database');
      throw error;
    }
  }
  public getConnection(): IDatabaseConnection {
    return this.database.connection;
  }
  public getGuildSettingsRepository(): IGuildSettingsRepository {
    return this.database.settings;
  }
  public getUserRepository(): IUserRepository {
    return this.database.users;
  }
  public async close(): Promise<void> {
    await this.database.close();
    this.logger.info('Database service closed', 'database');
  }
  public isConnected(): boolean {
    return this.database.connection.isConnected();
  }
}
