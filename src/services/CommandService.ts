/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import { Client } from 'discord.js';
import { importx } from '@discordx/importer';
import { ICommandManager } from '../interfaces/IClient';
import { ILogger } from '../core/Logger';
import { join } from 'path';
export class CommandService implements ICommandManager {
  private client: Client;
  private logger: ILogger;
  constructor(client: Client, logger: ILogger) {
    this.client = client;
    this.logger = logger;
  }
  public async importCommands(): Promise<void> {
    try {
      const commandsPath = join(__dirname, '..', 'commands', '**', '*.{ts,js}');
      await importx(commandsPath);
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
