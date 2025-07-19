/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import { Settings } from '../core/Settings';
import { IDiscordConfig, IDatabaseConfig, IBotConfig } from '../interfaces/ISettings';
export class ConfigurationService {
  private settings: Settings;
  constructor() {
    this.settings = new Settings();
  }
  public async loadConfiguration(): Promise<void> {
    this.settings.validate();
  }
  public getDiscordConfig(): IDiscordConfig {
    return {
      token: this.settings.token,
      client_id: this.settings.client_id,
    };
  }
  public getDatabaseConfig(): IDatabaseConfig {
    return {
      mongodb_url: this.settings.mongodb_url,
      mongodb_name: this.settings.mongodb_name,
    };
  }
  public getBotConfig(): IBotConfig {
    return {
      prefix: this.settings.prefix,
      embed_color: this.settings.embed_color,
      default_max_queue: this.settings.default_max_queue,
      lyrics_platform: this.settings.lyrics_platform,
      bot_access_user: this.settings.bot_access_user,
      cooldowns: this.settings.cooldowns,
      aliases: this.settings.aliases,
    };
  }
  public getLoggingConfig() {
    return this.settings.logging;
  }
  public getSettings(): Settings {
    return this.settings;
  }
}
