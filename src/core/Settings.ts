/**
 * MIT License
 *
 * Copyright (c) 2025 NirrussVn0
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { ISettings, INodeConfig, IActivityConfig, ILoggingConfig, IIPCConfig, IControllerConfig } from '../interfaces/ISettings';
config();
export class Settings implements ISettings {
  public token: string = process.env.DISCORD_TOKEN || '?';
  public client_id: string = process.env.DISCORD_CLIENT_ID || '?';
  public genius_token?: string;
  public mongodb_url: string = process.env.MONGODB_URL || '?' ;
  public mongodb_name: string = process.env.MONGODB_NAME || '?';
  public nodes: Record<string, INodeConfig> = {};
  public prefix: string = process.env.BOT_PREFIX || '?';
  public activity: IActivityConfig[] = this.getDefaultActivity();
  public logging: ILoggingConfig = this.getDefaultLogging();
  public bot_access_user: string[] = [];
  public embed_color: string = process.env.EMBED_COLOR || '0xb3b3b3';
  public default_max_queue: number = parseInt(process.env.MAX_QUEUE_SIZE || '1000');
  public lyrics_platform: string = process.env.LYRICS_PLATFORM || 'lrclib';
  public ipc_client: IIPCConfig = this.getDefaultIPC();
  public sources_settings: Record<string, any> = this.getDefaultSources();
  public default_controller: IControllerConfig = this.getDefaultController();
  public default_voice_status_template: string = this.getDefaultVoiceStatusTemplate();
  public cooldowns: Record<string, [number, number]> = {};
  public aliases: Record<string, string[]> = {};
  public version?: string;
  constructor() {
    const fileSettings = this.loadFileSettings();
    this.initializeRequiredSettings(fileSettings);
    this.initializeOptionalSettings(fileSettings);
    this.initializeComplexSettings(fileSettings);
    this.validate();
  }
  private loadFileSettings(): any {
    const settingsPath = join(process.cwd(), 'settings.json');
    if (!existsSync(settingsPath)) {
      return {};
    }
    try {
      const fileContent = readFileSync(settingsPath, 'utf8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.warn('Failed to parse settings.json, using environment variables only');
      return {};
    }
  }
  private initializeRequiredSettings(fileSettings: any): void {
    this.token = fileSettings.token || process.env.DISCORD_TOKEN || '';
    this.client_id = fileSettings.client_id || process.env.DISCORD_CLIENT_ID || '';
    this.mongodb_url = fileSettings.mongodb_url || process.env.MONGODB_URL || '';
    this.mongodb_name = fileSettings.mongodb_name || process.env.MONGODB_NAME || '';
  }
  private initializeOptionalSettings(fileSettings: any): void {
    this.genius_token = fileSettings.genius_token || process.env.GENIUS_TOKEN;
    this.prefix = fileSettings.prefix || process.env.BOT_PREFIX || '?';
    this.embed_color = fileSettings.embed_color || process.env.EMBED_COLOR || '0xb3b3b3';
    this.default_max_queue = fileSettings.default_max_queue || parseInt(process.env.MAX_QUEUE_SIZE || '1000');
    this.lyrics_platform = fileSettings.lyrics_platform || process.env.LYRICS_PLATFORM || 'lrclib';
    this.bot_access_user = fileSettings.bot_access_user || [];
    this.version = fileSettings.version;
  }
  private initializeComplexSettings(fileSettings: any): void {
    this.nodes = fileSettings.nodes || this.getDefaultNodes();
    this.activity = fileSettings.activity || this.getDefaultActivity();
    this.logging = fileSettings.logging || this.getDefaultLogging();
    this.ipc_client = fileSettings.ipc_client || this.getDefaultIPC();
    this.sources_settings = fileSettings.sources_settings || this.getDefaultSources();
    this.default_controller = fileSettings.default_controller || this.getDefaultController();
    this.default_voice_status_template = fileSettings.default_voice_status_template || this.getDefaultVoiceStatusTemplate();
    this.cooldowns = fileSettings.cooldowns || {};
    this.aliases = fileSettings.aliases || {};
  }
  public validate(): void {
    const requiredSettings = ['token', 'client_id', 'mongodb_url', 'mongodb_name'];
    const missingSettings = requiredSettings.filter(setting => !this[setting as keyof this]);
    if (missingSettings.length > 0) {
      throw new Error(`Missing required settings: ${missingSettings.join(', ')}`);
    }
  }
  private getDefaultActivity(): IActivityConfig[] {
    return [{ type: 'listening', name: '/help', status: 'online' }];
  }
  private getDefaultVoiceStatusTemplate(): string {
    return '{{@@track_name@@ != \'None\' ?? @@track_source_emoji@@ Now Playing: @@track_name@@}}';
  }
  private getDefaultNodes(): Record<string, INodeConfig> {
    return {
      DEFAULT: {
        host: process.env.LAVALINK_HOST || 'localhost',
        port: parseInt(process.env.LAVALINK_PORT || '2333'),
        password: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
        secure: process.env.LAVALINK_SECURE === 'true',
        identifier: 'DEFAULT',
      },
    };
  }
  private getDefaultLogging(): ILoggingConfig {
    return {
      file: {
        path: process.env.LOG_FILE_PATH || './logs',
        enable: process.env.LOG_FILE_ENABLE !== 'false',
      },
      level: {
        discord: process.env.LOG_LEVEL || 'info',
        vocard: process.env.LOG_LEVEL || 'info',
        ipc_client: process.env.LOG_LEVEL || 'info',
      },
      'max-history': parseInt(process.env.LOG_MAX_HISTORY || '30'),
    };
  }
  private getDefaultIPC(): IIPCConfig {
    return {
      host: process.env.IPC_HOST || '127.0.0.1',
      port: parseInt(process.env.IPC_PORT || '8000'),
      password: process.env.IPC_PASSWORD || '',
      secure: process.env.IPC_SECURE === 'true',
      enable: process.env.IPC_ENABLE === 'true',
    };
  }
  private getDefaultSources(): Record<string, any> {
    return {
      youtube: { emoji: '🎵', color: '0xFF0000' },
      youtubemusic: { emoji: '🎵', color: '0xFF0000' },
      spotify: { emoji: '🎵', color: '0x1DB954' },
      soundcloud: { emoji: '🎵', color: '0xFF7700' },
      twitch: { emoji: '🎵', color: '0x9B4AFF' },
      bandcamp: { emoji: '🎵', color: '0x6F98A7' },
      vimeo: { emoji: '🎵', color: '0x1ABCEA' },
      applemusic: { emoji: '🎵', color: '0xE298C4' },
      reddit: { emoji: '🎵', color: '0xFF5700' },
      tiktok: { emoji: '🎵', color: '0x74ECE9' },
      others: { emoji: '🔗', color: '0xb3b3b3' },
    };
  }
  private getDefaultController(): IControllerConfig {
    return {
      embeds: {
        active: {
          description: '**Now Playing: ```[@@track_name@@]```\nLink: [Click Me](@@track_url@@) | Requester: @@track_requester_mention@@ | DJ: @@dj@@**',
          footer: {
            text: 'Queue Length: @@queue_length@@ | Duration: @@track_duration@@ | Volume: @@volume@@% {{loop_mode != \'Off\' ?? | Repeat: @@loop_mode@@}}',
          },
          image: '@@track_thumbnail@@',
          author: {
            name: 'Music Controller | @@channel_name@@',
            icon_url: '@@bot_icon@@',
          },
          color: '@@track_color@@',
        },
        inactive: {
          title: {
            name: 'There are no songs playing right now',
          },
          description: '[Support](@@server_invite_link@@) | [Invite](@@invite_link@@)',
          image: 'https://example.com/default-image.png',
          color: '@@default_embed_color@@',
        },
      },
      default_buttons: [
        ['back', 'resume', 'skip', { stop: 'red' }, 'add'],
        ['tracks'],
      ],
      disableButtonText: false,
    };
  }
}
