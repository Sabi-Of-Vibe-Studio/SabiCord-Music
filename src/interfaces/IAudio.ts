/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

import { VoiceChannel, Guild, User } from 'discord.js';
import { Track } from '../audio/Track';
import { LoopMode, PlayerState } from '../audio/Enums';

export interface IAudioPlayer {
  readonly guild: Guild;
  readonly channel: VoiceChannel;
  readonly playing: boolean;
  readonly paused: boolean;
  readonly connected: boolean;
  readonly volume: number;
  readonly loopMode: LoopMode;
  readonly state: PlayerState;
  readonly current: Track | undefined;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  play(track?: Track): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  skip(): Promise<void>;
  seek(position: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  setLoop(mode: LoopMode): void;
  destroy(): Promise<void>;
}

export interface IAudioQueue {
  size(): number;
  isEmpty(): boolean;
  isFull(): boolean;
  add(track: Track): void;
  poll(): Track | null;
  peek(): Track | null;
  remove(index: number): Track | null;
  clear(): void;
  shuffle(): void;
  getTracks(): Track[];
}

export interface IAudioNode {
  readonly identifier: string;
  readonly host: string;
  readonly port: number;
  readonly available: boolean;
  readonly playerCount: number;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  search(query: string, requester: User): Promise<any>;
  send(method: string, endpoint: string, data?: any, query?: string): Promise<any>;
}

export interface IAudioFilters {
  setVolume(volume: number): this;
  setEqualizer(bands: any[]): this;
  setKaraoke(settings: any): this;
  setTimescale(settings: any): this;
  clearAll(): this;
  toJSON(): any;
}

export interface IAudioManager {
  createPlayer(options: any): IAudioPlayer;
  getPlayer(guildId: string): IAudioPlayer | null;
  hasPlayer(guildId: string): boolean;
  destroyPlayer(guildId: string): Promise<void>;
  searchTracks(query: string, requester: User): Promise<any>;
}

export interface IAudioConnection {
  connect(channel: VoiceChannel): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getConnection(): any;
}

export interface IAudioEffects {
  applyFilters(filters: IAudioFilters): Promise<void>;
  setVolume(volume: number): Promise<void>;
  setBassBoost(level: number): Promise<void>;
  resetFilters(): Promise<void>;
}

export interface IAudioEvents {
  on(event: 'trackStart', listener: (player: IAudioPlayer, track: Track) => void): this;
  on(event: 'trackEnd', listener: (player: IAudioPlayer, track: Track, reason: string) => void): this;
  on(event: 'queueEnd', listener: (player: IAudioPlayer) => void): this;
  on(event: 'playerDestroy', listener: (player: IAudioPlayer) => void): this;
  emit(event: string, ...args: any[]): boolean;
}
