/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import { Client, Message, Interaction, Guild } from 'discord.js';
import { IEventHandler } from '../interfaces/IClient';
import { ILogger } from '../core/Logger';
import { IBotConfig } from '../interfaces/ISettings';
export class EventHandlerService implements IEventHandler {
  private client: Client;
  private logger: ILogger;
  private botConfig: IBotConfig;
  constructor(client: Client, logger: ILogger, botConfig: IBotConfig) {
    this.client = client;
    this.logger = logger;
    this.botConfig = botConfig;
  }
  public setupEventHandlers(): void {
    this.client.on('ready', () => this.onReady());
    this.client.on('interactionCreate', (interaction) => this.onInteractionCreate(interaction));
    this.client.on('messageCreate', (message) => this.onMessageCreate(message));
    this.client.on('guildCreate', (guild) => this.onGuildCreate(guild));
    this.client.on('guildDelete', (guild) => this.onGuildDelete(guild));
    this.client.on('error', (error) => this.onError(error));
    this.client.on('warn', (warning) => this.onWarning(warning));
    this.logger.info('Event handlers registered', 'events');
  }
  public async onReady(): Promise<void> {
    if (!this.client.user) return;
    this.logger.info('------------------', 'client');
    this.logger.info(`Logged in as ${this.client.user.tag}`, 'client');
    this.logger.info(`Bot ID: ${this.client.user.id}`, 'client');
    this.logger.info(`Serving ${this.client.guilds.cache.size} guilds`, 'client');
    this.logger.info('------------------', 'client');
    this.client.user.setActivity('Music | /help', { type: 2 }); 
  }
  public async onInteractionCreate(interaction: Interaction): Promise<void> {
    try {
      this.logger.debug(`Interaction received: ${interaction.type}`, 'events');
    } catch (error) {
      this.logger.error('Error handling interaction', error as Error, 'events');
    }
  }
  public async onMessageCreate(message: Message): Promise<void> {
    try {
      if (message.author.bot) return;
      if (message.content.startsWith(this.botConfig.prefix)) {
        this.logger.debug(`Prefix command received: ${message.content}`, 'events');
      }
    } catch (error) {
      this.logger.error('Error handling message', error as Error, 'events');
    }
  }
  private async onGuildCreate(guild: Guild): Promise<void> {
    this.logger.info(`Joined guild: ${guild.name} (${guild.id})`, 'events');
  }
  private async onGuildDelete(guild: Guild): Promise<void> {
    this.logger.info(`Left guild: ${guild.name} (${guild.id})`, 'events');
  }
  private onError(error: Error): void {
    this.logger.error('Discord client error', error, 'events');
  }
  private onWarning(warning: string): void {
    this.logger.warn(`Discord client warning: ${warning}`, 'events');
  }
}
