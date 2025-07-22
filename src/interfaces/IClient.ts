/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import { Guild, VoiceChannel } from 'discord.js';
export interface IDiscordClient {
  start(): Promise<void>;
  shutdown(): Promise<void>;
  isReady(): boolean;
}
export interface IServiceInitializer {
  initializeServices(): Promise<void>;
  registerServices(): void;
}
export interface IEventHandler {
  setupEventHandlers(): void;
  onReady(): Promise<void>;
  onInteractionCreate(interaction: any): Promise<void>;
}
export interface ICommandManager {
  importCommands(): Promise<void>;
  syncCommands(): Promise<void>;
}
export interface IMusicService {
  createPlayer(guild: Guild, channel: VoiceChannel): Promise<any>;
  getPlayer(guildId: string): any | null;
  destroyPlayer(guildId: string): Promise<void>;
}
