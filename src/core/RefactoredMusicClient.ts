/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import 'reflect-metadata';
import { GatewayIntentBits } from 'discord.js';
import { Client as DiscordXClient } from 'discordx';
import { IDiscordClient, IServiceInitializer } from '../interfaces/IClient';
import { ILogger, LoggerFactory } from './Logger';
import { ServiceContainer } from './ServiceContainer';
import { ConfigurationService } from '../services/ConfigurationService';
import { DatabaseService } from '../services/DatabaseService';
import { EventHandlerService } from '../services/EventHandlerService';
import { CommandService } from '../services/CommandService';
export class SabiCordMusicClient extends DiscordXClient implements IDiscordClient, IServiceInitializer {
  private logger!: ILogger;
  private serviceContainer: ServiceContainer;
  private configService!: ConfigurationService;
  private databaseService!: DatabaseService;
  private eventHandlerService!: EventHandlerService;
  private commandService!: CommandService;
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
      silent: false,
      simpleCommand: {
        prefix: '?',
      },
    });
    this.serviceContainer = ServiceContainer.getInstance();
  }
  public async initializeServices(): Promise<void> {
    try {
      this.configService = new ConfigurationService();
      await this.configService.loadConfiguration();
      const loggerFactory = new LoggerFactory();
      this.logger = loggerFactory.createLogger(this.configService.getLoggingConfig());
      this.databaseService = new DatabaseService(
        this.configService.getDatabaseConfig(),
        this.logger
      );
      this.eventHandlerService = new EventHandlerService(
        this,
        this.logger,
        this.configService.getBotConfig()
      );
      this.commandService = new CommandService(this, this.logger);
      this.registerServices();
      this.logger.info('Services initialized successfully', 'client');
    } catch (error) {
      console.error('Failed to initialize services:', error);
      process.exit(1);
    }
  }
  public registerServices(): void {
    this.serviceContainer.registerCoreServices(
      this.logger,
      this.configService.getDiscordConfig(),
      this.configService.getDatabaseConfig(),
      this.configService.getBotConfig()
    );
    if (this.databaseService.isConnected()) {
      this.serviceContainer.registerDatabaseServices(
        this.databaseService.getConnection(),
        this.databaseService.getGuildSettingsRepository(),
        this.databaseService.getUserRepository()
      );
    }
    this.serviceContainer.registerClient(this);
  }
  public isReady(): boolean {
    return this.readyAt !== null;
  }
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down bot...', 'client');
    if (this.databaseService) {
      await this.databaseService.close();
    }
    this.destroy();
    this.logger.info('Bot shutdown complete', 'client');
  }
  public async start(): Promise<void> {
    try {
      await this.initializeServices();
      await this.databaseService.initialize();
      this.logger.info('Database connected successfully', 'client');
      this.eventHandlerService.setupEventHandlers();
      await this.commandService.importCommands();
      const discordConfig = this.configService.getDiscordConfig();
      await this.login(discordConfig.token);
      this.logger.info('Bot started successfully', 'client');
    } catch (error) {
      this.logger.error('Failed to start bot', error as Error, 'client');
      process.exit(1);
    }
  }
}
process.on('SIGINT', async () => {
  const serviceContainer = ServiceContainer.getInstance();
  if (serviceContainer.isRegistered('Client')) {
    const client = serviceContainer.resolve<SabiCordMusicClient>('Client');
    await client.shutdown();
  }
  process.exit(0);
});
process.on('SIGTERM', async () => {
  const serviceContainer = ServiceContainer.getInstance();
  if (serviceContainer.isRegistered('Client')) {
    const client = serviceContainer.resolve<SabiCordMusicClient>('Client');
    await client.shutdown();
  }
  process.exit(0);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection at:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
