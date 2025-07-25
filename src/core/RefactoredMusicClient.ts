/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import 'reflect-metadata';
import { IntentsBitField , Client , Message, Interaction } from 'discord.js';
import { Client as DiscordXClient } from 'discordx';
import { IDiscordClient, IServiceInitializer } from '../interfaces/IClient';
import { ILogger, LoggerFactory } from './Logger';
import { ServiceContainer } from './ServiceContainer';
import { ConfigurationService } from '../services/ConfigurationService';
import { DatabaseService } from '../services/DatabaseService';
import { EventHandlerService } from '../services/EventHandlerService';
import { CommandService } from '../services/CommandService';
import { dirname, importx } from "@discordx/importer";
import dotenv from "dotenv";
dotenv.config();

export class SabiCordMusicClient extends DiscordXClient implements IDiscordClient, IServiceInitializer {
  private musicLogger!: ILogger;
  private serviceContainer: ServiceContainer;
  private configService!: ConfigurationService;
  private databaseService!: DatabaseService;
  private eventHandlerService!: EventHandlerService;
  private commandService!: CommandService;
  
  constructor() {
    super({
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.MessageContent,
      ],
      silent: false,
      simpleCommand: {
        prefix: process.env.BOT_PREFIX?.toString() || "!",
      },
    });
    this.serviceContainer = ServiceContainer.getInstance();
  }
  public async initializeServices(): Promise<void> {
    try {
      this.configService = new ConfigurationService();
      await this.configService.loadConfiguration();
      const loggerFactory = new LoggerFactory();
      this.musicLogger = loggerFactory.createLogger(this.configService.getLoggingConfig());
      this.databaseService = new DatabaseService(
        this.configService.getDatabaseConfig(),
        this.musicLogger
      );
      this.eventHandlerService = new EventHandlerService(
        (this as unknown as Client<boolean>),
        this.musicLogger,
        this.configService.getBotConfig()
      );
      this.commandService = new CommandService((this as unknown as Client<boolean>), this.musicLogger);
      this.registerServices();
      this.musicLogger.info('Services initialized successfully', 'client');
    } catch (error) {
      console.error('Failed to initialize services:', error);
      process.exit(1);
    }
  }
  public registerServices(): void {
    this.serviceContainer.registerCoreServices(
      this.musicLogger,
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
  // public async run(): Promise<void> {
  //   await importx(`${dirname(import.meta.url)}/{event,../commands}/**/*.{ts,js}`);
  //   this.once("ready", async () => {
  //     await this.initApplicationCommands();
  //     await this.clearApplicationCommands(
  //       ...this.guilds.cache.map((g) => g.id)
  //   );
  //     this.on("interactionCreate", (interaction: Interaction) => {
  //     this.executeInteraction(interaction);
  //     });
  //     this.on("messageCreate", (message: Message) => {
  //     void this.executeCommand(message);
  //     });
  //   });
  //   if (!process.env.DISCORD_TOKEN) {
  //     throw Error("Could not find DISCORD_TOKEN in your environment");
  //   }
  //   // await client.login(process.env.DISCORD_TOKEN);
  // }

  public override isReady(): this is SabiCordMusicClient & Client<true> {
    return super.isReady();
  }
  public async shutdown(): Promise<void> {
    this.musicLogger.info('Shutting down bot...', 'client');
    if (this.databaseService) {
      await this.databaseService.close();
    }
    this.destroy();
    this.musicLogger.info('Bot shutdown complete', 'client');
  }
  public async start(): Promise<void> {
    try {
      await this.initializeServices();
      await this.databaseService.initialize();
      this.musicLogger.info('Database connected successfully', 'client');
      this.eventHandlerService.setupEventHandlers();
      await this.commandService.importCommands();
      this.musicLogger.info('Commands imported successfully', 'client');
      // const discordConfig = this.configService.getDiscordConfig();
      // await this.login(discordConfig.token);
      // void this.run();
      this.musicLogger.info('Bot started successfully', 'client');
      this.musicLogger.info('Application commands synchronized successfully', 'client');
    } catch (error) {
      this.musicLogger.error('Failed to start bot', error as Error, 'client');
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
