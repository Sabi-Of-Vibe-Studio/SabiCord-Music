/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { ISettings, INodeConfig, IActivityConfig, ILoggingConfig, IIPCConfig, IControllerConfig } from '@interfaces/ISettings';

// Load environment variables
config();

export class Settings implements ISettings {
  public readonly token: string;
  public readonly client_id: string;
  public readonly genius_token?: string;
  public readonly mongodb_url: string;
  public readonly mongodb_name: string;
  public readonly nodes: Record<string, INodeConfig>;
  public readonly prefix: string;
  public readonly activity: IActivityConfig[];
  public readonly logging: ILoggingConfig;
  public readonly bot_access_user: string[];
  public readonly embed_color: string;
  public readonly default_max_queue: number;
  public readonly lyrics_platform: string;
  public readonly ipc_client: IIPCConfig;
  public readonly sources_settings: Record<string, any>;
  public readonly default_controller: IControllerConfig;
  public readonly default_voice_status_template: string;
  public readonly cooldowns: Record<string, [number, number]>;
  public readonly aliases: Record<string, string[]>;
  public version?: string;

  constructor() {
    // Try to load from settings.json first, then fall back to environment variables
    const settingsPath = join(process.cwd(), 'settings.json');
    let fileSettings: any = {};

    if (existsSync(settingsPath)) {
      try {
        const fileContent = readFileSync(settingsPath, 'utf8');
        fileSettings = JSON.parse(fileContent);
      } catch (error) {
        console.warn('Failed to parse settings.json, using environment variables only');
      }
    }

    // Required settings
    this.token = fileSettings.token || process.env.DISCORD_TOKEN || '';
    this.client_id = fileSettings.client_id || process.env.DISCORD_CLIENT_ID || '';
    this.mongodb_url = fileSettings.mongodb_url || process.env.MONGODB_URL || '';
    this.mongodb_name = fileSettings.mongodb_name || process.env.MONGODB_NAME || '';

    if (!this.token || !this.client_id || !this.mongodb_url || !this.mongodb_name) {
      throw new Error('Missing required configuration: token, client_id, mongodb_url, or mongodb_name');
    }

    // Optional settings with defaults
    this.genius_token = fileSettings.genius_token || process.env.GENIUS_TOKEN;
    this.prefix = fileSettings.prefix || process.env.BOT_PREFIX || '?';
    this.embed_color = fileSettings.embed_color || process.env.EMBED_COLOR || '0xb3b3b3';
    this.default_max_queue = fileSettings.default_max_queue || parseInt(process.env.MAX_QUEUE_SIZE || '1000');
    this.lyrics_platform = fileSettings.lyrics_platform || process.env.LYRICS_PLATFORM || 'lrclib';
    this.bot_access_user = fileSettings.bot_access_user || [];

    // Nodes configuration
    this.nodes = fileSettings.nodes || this.getDefaultNodes();

    // Activity configuration
    this.activity = fileSettings.activity || [{ type: 'listening', name: '/help', status: 'online' }];

    // Logging configuration
    this.logging = fileSettings.logging || this.getDefaultLogging();

    // IPC configuration
    this.ipc_client = fileSettings.ipc_client || this.getDefaultIPC();

    // Sources settings
    this.sources_settings = fileSettings.sources_settings || this.getDefaultSources();

    // Controller configuration
    this.default_controller = fileSettings.default_controller || this.getDefaultController();

    // Voice status template
    this.default_voice_status_template = fileSettings.default_voice_status_template || 
      '{{@@track_name@@ != \'None\' ?? @@track_source_emoji@@ Now Playing: @@track_name@@ // Waiting for song requests}}';

    // Cooldowns and aliases
    this.cooldowns = fileSettings.cooldowns || {};
    this.aliases = fileSettings.aliases || {};

    this.version = fileSettings.version;
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
          image: 'https://i.imgur.com/dIFBwU7.png',
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

  public validate(): void {
    const required = ['token', 'client_id', 'mongodb_url', 'mongodb_name'];
    const missing = required.filter(key => !this[key as keyof this]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required settings: ${missing.join(', ')}`);
    }
  }
}
