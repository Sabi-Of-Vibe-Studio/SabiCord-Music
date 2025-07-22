/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import { MongoClient } from 'mongodb';
import { IGuildSettings, IUserData } from './ISettings';
export interface IDatabaseConnection {
  client: MongoClient;
  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  ping(): Promise<boolean>;
}
export interface IDatabaseOperations<T> {
  findById(id: string): Promise<T | null>;
  findOne(filter: any): Promise<T | null>;
  findMany(filter: any, options?: any): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  insertOne(document: T): Promise<boolean>;
  insertMany(documents: T[]): Promise<boolean>;
  updateById(id: string, data: Partial<T>): Promise<boolean>;
  updateOne(filter: any, update: any): Promise<boolean>;
  updateMany(filter: any, update: any): Promise<boolean>;
  deleteById(id: string): Promise<boolean>;
  deleteOne(filter: any): Promise<boolean>;
  deleteMany(filter: any): Promise<boolean>;
  count(filter?: any): Promise<number>;
}
export interface IGuildSettingsRepository extends IDatabaseOperations<IGuildSettings> {
  getSettings(guildId: string): Promise<IGuildSettings>;
  updateSettings(guildId: string, data: any): Promise<boolean>;
  createDefaultSettings(guildId: string): Promise<IGuildSettings>;
}
export interface IUserRepository extends IDatabaseOperations<IUserData> {
  getUser(userId: string, dataType?: string): Promise<IUserData>;
  updateUser(userId: string, data: any): Promise<boolean>;
  createDefaultUser(userId: string): Promise<IUserData>;
  getUserPlaylist(userId: string, playlistId: string): Promise<any>;
  updateUserPlaylist(userId: string, playlistId: string, data: any): Promise<boolean>;
  addToHistory(userId: string, track: any, guildId: string): Promise<boolean>;
}
export interface IDatabase {
  connection: IDatabaseConnection;
  settings: IGuildSettingsRepository;
  users: IUserRepository;
  initialize(): Promise<void>;
  close(): Promise<void>;
}
export interface ICacheManager<T> {
  get(key: string): T | undefined;
  set(key: string, value: T, ttl?: number): void;
  delete(key: string): boolean;
  clear(): void;
  has(key: string): boolean;
  size(): number;
}
export interface IDatabaseCache {
  settings: ICacheManager<IGuildSettings>;
  users: ICacheManager<IUserData>;
  clear(): void;
}
