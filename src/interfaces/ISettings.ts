/**
 * MIT License
 *
 * Copyright (c) 2025 NirrussVn0
 */
export interface IDiscordConfig {
  token: string;
  client_id: string;
}
export interface IDatabaseConfig {
  mongodb_url: string;
  mongodb_name: string;
}
export interface IBotConfig {
  prefix: string;
  embed_color: string;
  default_max_queue: number;
  lyrics_platform: string;
  bot_access_user: string[];
  cooldowns: Record<string, [number, number]>;
  aliases: Record<string, string[]>;
}
export interface INodeConfig {
  host: string;
  port: number;
  password: string;
  secure: boolean;
  identifier: string;
  yt_ratelimit?: {
    tokens: string[];
    config: {
      retry_time: number;
      max_requests: number;
    };
    strategy: string;
  };
}
export interface IActivityConfig {
  type: 'playing' | 'streaming' | 'listening' | 'watching' | 'competing';
  name: string;
  status?: 'online' | 'idle' | 'dnd' | 'invisible';
}
export interface ILoggingConfig {
  file: {
    path: string;
    enable: boolean;
  };
  level: Record<string, string>;
  'max-history': number;
}
export interface ISourceSettings {
  emoji: string;
  color: string;
}
export interface IControllerEmbedConfig {
  description?: string;
  footer?: {
    text: string;
  };
  image?: string;
  author?: {
    name: string;
    icon_url: string;
  };
  color?: string;
  title?: {
    name: string;
  };
}
export interface IControllerConfig {
  embeds: {
    active: IControllerEmbedConfig;
    inactive: IControllerEmbedConfig;
  };
  default_buttons: Array<Array<string | Record<string, string>>>;
  disableButtonText: boolean;
}
export interface IIPCConfig {
  host: string;
  port: number;
  password: string;
  secure: boolean;
  enable: boolean;
}
export interface ISettings {
  token: string;
  client_id: string;
  genius_token?: string;
  mongodb_url: string;
  mongodb_name: string;
  nodes: Record<string, INodeConfig>;
  prefix: string;
  activity: IActivityConfig[];
  logging: ILoggingConfig;
  bot_access_user: string[];
  embed_color: string;
  default_max_queue: number;
  lyrics_platform: string;
  ipc_client: IIPCConfig;
  sources_settings: Record<string, ISourceSettings>;
  default_controller: IControllerConfig;
  default_voice_status_template: string;
  cooldowns: Record<string, [number, number]>;
  aliases: Record<string, string[]>;
  version?: string;
}
export interface IGuildSettings {
  _id: number;
  lang?: string;
  prefix?: string;
  music_request_channel?: {
    text_channel_id: number;
  };
  controller_msg?: boolean;
  [key: string]: any;
}
export interface IUserData {
  _id: number;
  playlist: Record<string, IPlaylistData>;
  history: ITrackHistory[];
  inbox: any[];
}
export interface IPlaylistData {
  tracks: ITrackData[];
  perms: {
    read: number[];
    write: number[];
    remove: number[];
  };
  name: string;
  type: string;
}
export interface ITrackData {
  track_id: string;
  title: string;
  author: string;
  uri: string;
  length: number;
  thumbnail?: string;
  requester?: number;
  start_time?: number;
  end_time?: number;
}
export interface ITrackHistory {
  track: ITrackData;
  played_at: Date;
  guild_id: number;
}
