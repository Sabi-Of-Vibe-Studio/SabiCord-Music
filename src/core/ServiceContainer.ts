/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import { container } from 'tsyringe';
import { ILogger } from './Logger';
import { IDatabaseConnection, IGuildSettingsRepository, IUserRepository } from '../interfaces/IRepository';
import { IDiscordConfig, IDatabaseConfig, IBotConfig } from '../interfaces/ISettings';
export class ServiceContainer {
  private static instance: ServiceContainer;
  private constructor() {}
  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }
  public registerCoreServices(
    logger: ILogger,
    discordConfig: IDiscordConfig,
    databaseConfig: IDatabaseConfig,
    botConfig: IBotConfig
  ): void {
    container.registerInstance('Logger', logger);
    container.registerInstance('DiscordConfig', discordConfig);
    container.registerInstance('DatabaseConfig', databaseConfig);
    container.registerInstance('BotConfig', botConfig);
  }
  public registerDatabaseServices(
    connection: IDatabaseConnection,
    settingsRepo: IGuildSettingsRepository,
    userRepo: IUserRepository
  ): void {
    container.registerInstance('DatabaseConnection', connection);
    container.registerInstance('GuildSettingsRepository', settingsRepo);
    container.registerInstance('UserRepository', userRepo);
  }
  public registerClient(client: any): void {
    container.registerInstance('Client', client);
  }
  public resolve<T>(token: string): T {
    return container.resolve<T>(token);
  }
  public isRegistered(token: string): boolean {
    try {
      container.resolve(token);
      return true;
    } catch {
      return false;
    }
  }
  public clear(): void {
    container.clearInstances();
  }
}
