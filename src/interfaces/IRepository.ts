/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
export interface IRepository<T, K = string> {
  findById(id: K): Promise<T | null>;
  findOne(filter: any): Promise<T | null>;
  findMany(filter: any, limit?: number): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  updateById(id: K, data: Partial<T>): Promise<boolean>;
  updateOne(filter: any, data: Partial<T>): Promise<boolean>;
  deleteById(id: K): Promise<boolean>;
  deleteOne(filter: any): Promise<boolean>;
  count(filter?: any): Promise<number>;
}
export interface ICache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T, ttl?: number): void;
  delete(key: string): boolean;
  clear(): void;
  size(): number;
}
export interface IDatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  ping(): Promise<boolean>;
}
export interface IDatabaseFactory {
  createGuildSettingsRepository(): IGuildSettingsRepository;
  createUserRepository(): IUserRepository;
}
export interface IGuildSettingsRepository extends IRepository<IGuildSettings, string> {
  getSettings(guildId: string): Promise<IGuildSettings>;
  updateSettings(guildId: string, settings: Partial<IGuildSettings>): Promise<boolean>;
  createDefaultSettings(guildId: string): Promise<IGuildSettings>;
}
export interface IUserRepository extends IRepository<IUserData, string> {
  getUser(userId: string): Promise<IUserData>;
  updateUser(userId: string, data: Partial<IUserData>): Promise<boolean>;
  addToHistory(userId: string, track: any, guildId: string): Promise<boolean>;
  createDefaultUser(userId: string): Promise<IUserData>;
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
  playlist: Record<string, any>;
  history: any[];
  inbox: any[];
}
