/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

import 'reflect-metadata';
import { Client, GatewayIntentBits, ActivityType, Message, Guild, Interaction } from 'discord.js';
import { DIService, MetadataStorage, Client as DiscordXClient } from 'Discordx';
import { container } from 'tsyringe';
import { Settings } from './Settings';
import { Database } from './Database';
import { Logger, logger } from './Logger';
import { Utils } from './Utils';
import { ISettings } from '@interfaces/ISettings';

export class VocardClient extends DiscordXClient {
  private settings: Settings;
  private database: Database;
  private logger: Logger;

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
        prefix: '?', // Will be updated from settings
      },
    });

    this.initializeServices();
  }

  private initializeServices(): void {
    try {
      // Initialize settings
      this.settings = new Settings();
      this.settings.validate();

      // Initialize logger
      this.logger = Logger.getInstance(this.settings.logging);

      // Initialize database
      this.database = new Database(this.settings.mongodb_url, this.settings.mongodb_name);

      // Register services in DI container
      container.registerInstance('Settings', this.settings);
      container.registerInstance('Database', this.database);
      container.registerInstance('Logger', this.logger);
      container.registerInstance('Client', this);

      logger.info('Services initialized successfully', 'client');
    } catch (error) {
      console.error('Failed to initialize services:', error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await this.database.initialize();
      logger.info('Database connected successfully', 'client');

      // Set up event handlers
      this.setupEventHandlers();

      // Import commands and events
      await this.importCommands();

      // Login to Discord
      await this.login(this.settings.token);
      
      logger.info('Bot started successfully', 'client');
    } catch (error) {
      logger.error('Failed to start bot', error as Error, 'client');
      process.exit(1);
    }
  }

  private setupEventHandlers(): void {
    this.once('ready', this.onReady.bind(this));
    this.on('messageCreate', this.onMessage.bind(this));
    this.on('interactionCreate', this.onInteraction.bind(this));
    this.on('guildCreate', this.onGuildJoin.bind(this));
    this.on('guildDelete', this.onGuildLeave.bind(this));
    this.on('error', this.onError.bind(this));
    this.on('warn', this.onWarn.bind(this));
  }

  private async importCommands(): Promise<void> {
    try {
      // Import command modules
      await import('@commands/BasicCommands');
      await import('@commands/PlaylistCommands');
      await import('@commands/EffectCommands');
      await import('@commands/SettingsCommands');

      logger.info('Commands imported successfully', 'client');
    } catch (error) {
      logger.error('Failed to import commands', error as Error, 'client');
    }
  }

  private async onReady(): Promise<void> {
    if (!this.user) return;

    logger.info('------------------', 'client');
    logger.info(`Logged in as ${this.user.tag}`, 'client');
    logger.info(`Bot ID: ${this.user.id}`, 'client');
    logger.info('------------------', 'client');

    // Set activity
    if (this.settings.activity.length > 0) {
      const activity = this.settings.activity[0]
      if (activity) { 
        this.user.setActivity(activity.name, {
          type: this.getActivityType(activity.type)
        })
        ;
      this.user.setActivity(activity.name, { 
        type: this.getActivityType(activity.type) 
      });
    }
  }

    // Sync slash commands
    await this.initApplicationCommands();
    logger.info('Application commands synchronized', 'client');

    // Update settings with client ID
    const settings = await this.database.settings.getSettings(this.user.id);
    //this.settings.client_id = this.user.id;
    settings.client_id = this.user.id;
  }

  private async onMessage(message: Message): Promise<void> {
    // Ignore messages from bots or DMs
    if (message.author.bot || !message.guild) return;

    // Check if bot is mentioned
    if (this.user && message.mentions.has(this.user) && !message.mentions.everyone) {
      const settings = await this.database.settings.getSettings(message.guild.id);
      const prefix = settings.prefix || this.settings.prefix;
      await message.reply(`My prefix is \`${prefix}\``);
      return;
    }

    // Check for music request channel
    // const guildSettings = await this.database.settings.getSettings(message.guild.id);
    const guildSettings = await this.database.settings.getSettings(message.guild.id);
    if (guildSettings.music_request_channel?.text_channel_id?.toString() === message.channel.id) {
      await this.handleMusicRequest(message);
      return;
    }
    
    // Process commands
    await this.executeCommand(message);
  }

  private async onInteraction(interaction: Interaction): Promise<void> {
    try {
      await this.executeInteraction(interaction);
    } catch (error) {
      logger.error('Error handling interaction', error as Error, 'client');
    }
  }

  private async onGuildJoin(guild: Guild): Promise<void> {
    logger.info(`Joined guild: ${guild.name} (${guild.id})`, 'client');
    // Create default settings for the guild
    await this.database.settings.createDefaultSettings(guild.id);
  }

  private async onGuildLeave(guild: Guild): Promise<void> {
    logger.info(`Left guild: ${guild.name} (${guild.id})`, 'client');
  }

  private onError(error: Error): void {
    logger.error('Discord client error', error, 'client');
  }

  private onWarn(warning: string): void {
    logger.warn(warning, 'client');
  }

  private async handleMusicRequest(message: Message): Promise<void> {
    try {
      let query = '';

      if (message.content) {
        const urls = Utils.extractUrls(message.content);
        if (urls.length > 0) {
          query = query + urls[0];
        } else {
          query = message.content;
        }
      } else if (message.attachments.size > 0) {
        const attachment = message.attachments.first();
        if (attachment) {
          query = attachment.url;
        }
      }

      if (query) {
        // TODO: Implement play command logic
        logger.debug(`Music request in ${message.guild?.name}: ${query}`, 'client');
      }

      // Delete the message after processing
      await message.delete().catch(() => {});
    } catch (error) {
      logger.error('Error handling music request', error as Error, 'client');
    }
  }

  private getActivityType(type: string): ActivityType {
    switch (type.toLowerCase()) {
      case 'playing':
        return ActivityType.Playing;
      case 'streaming':
        return ActivityType.Streaming;
      case 'listening':
        return ActivityType.Listening;
      case 'watching':
        return ActivityType.Watching;
      case 'competing':
        return ActivityType.Competing;
      default:
        return ActivityType.Playing;
    }
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down bot...', 'client');
    
    try {
      await this.database.close();
      await this.destroy();
      logger.info('Bot shutdown complete', 'client');
    } catch (error) {
      logger.error('Error during shutdown', error as Error, 'client');
    }
  }

  // Getters for services
  public getSettings(): Settings {
    return this.settings;
  }

  public getDatabase(): Database {
    return this.database;
  }

  public getLogger(): Logger {
    return this.logger;
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  const client = container.resolve<VocardClient>('Client');
  await client.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  const client = container.resolve<VocardClient>('Client');
  await client.shutdown();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', reason as Error, 'client');
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error, 'client');
  process.exit(1);
});
