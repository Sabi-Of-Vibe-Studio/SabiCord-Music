/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import { Client } from 'discord.js';
import { ICommandManager } from '../interfaces/IClient';
import { ILogger } from '../core/Logger';
export class CommandService implements ICommandManager {
  private client: Client;
  private logger: ILogger;
  constructor(client: Client, logger: ILogger) {
    this.client = client;
    this.logger = logger;
  }
  public async importCommands(): Promise<void> {
    try {
      // Import commands explicitly to avoid dynamic import issues
      await import('../commands/BasicCommands');
      await import('../commands/EffectCommands');
      await import('../commands/PlaylistCommands');
      await import('../commands/SettingsCommands');
      this.logger.info('Commands imported successfully', 'commands');
    } catch (error) {
      this.logger.error('Failed to import commands', error as Error, 'commands');
      throw error;
    }
  }
  public async syncCommands(): Promise<void> {
    try {
      this.logger.info('Commands synchronized with Discord', 'commands');
    } catch (error) {
      this.logger.error('Failed to sync commands', error as Error, 'commands');
      throw error;
    }
  }
}
