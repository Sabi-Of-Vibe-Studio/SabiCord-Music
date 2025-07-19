/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import { MongoClient, Db, Collection } from 'mongodb';
import { 
  IDatabase, 
  IDatabaseConnection, 
  IGuildSettingsRepository, 
  IUserRepository,
  ICacheManager,
  IDatabaseCache
} from '@interfaces/IDatabase';
import { IGuildSettings, IUserData } from '@interfaces/ISettings';
import { logger } from './Logger';
class CacheManager<T> implements ICacheManager<T> {
  private cache = new Map<string, { value: T; expires?: number }>();
  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key);
      return undefined;
    }
    return item.value;
  }
  set(key: string, value: T, ttl?: number): void {
    const expires = ttl ? Date.now() + ttl * 1000 : undefined;
    this.cache.set(key, { value, expires });
  }
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  clear(): void {
    this.cache.clear();
  }
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
  size(): number {
    return this.cache.size;
  }
}
class DatabaseConnection implements IDatabaseConnection {
  public client: MongoClient;
  public isConnected = false;
  constructor(private url: string) {
    this.client = new MongoClient(url);
  }
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      await this.client.db('admin').command({ ping: 1 });
      this.isConnected = true;
      logger.info('Successfully connected to MongoDB', 'database');
    } catch (error) {
      logger.error('Failed to connect to MongoDB', error as Error, 'database');
      logger.warn('Bot will continue in degraded mode without database functionality', 'database');
      this.isConnected = false;
    }
  }
  async disconnect(): Promise<void> {
    try {
      await this.client.close();
      this.isConnected = false;
      logger.info('Disconnected from MongoDB', 'database');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB', error as Error, 'database');
      throw error;
    }
  }
  async ping(): Promise<boolean> {
    try {
      await this.client.db('admin').command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }
}
class GuildSettingsRepository implements IGuildSettingsRepository {
  private collection: Collection<IGuildSettings>;
  private cache: CacheManager<IGuildSettings>;
  constructor(db: Db, cache: CacheManager<IGuildSettings>) {
    this.collection = db.collection<IGuildSettings>('Settings');
    this.cache = cache;
  }
  async findOne(filter: any): Promise<IGuildSettings | null> {
    return await this.collection.findOne(filter);
  }
  async findMany(filter: any, options?: any): Promise<IGuildSettings[]> {
    return await this.collection.find(filter, options).toArray();
  }
  async insertOne(document: IGuildSettings): Promise<boolean> {
    const result = await this.collection.insertOne(document);
    return result.acknowledged;
  }
  async insertMany(documents: IGuildSettings[]): Promise<boolean> {
    const result = await this.collection.insertMany(documents);
    return result.acknowledged;
  }
  async updateOne(filter: any, update: any): Promise<boolean> {
    const result = await this.collection.updateOne(filter, update);
    return result.modifiedCount > 0;
  }
  async updateMany(filter: any, update: any): Promise<boolean> {
    const result = await this.collection.updateMany(filter, update);
    return result.modifiedCount > 0;
  }
  async deleteOne(filter: any): Promise<boolean> {
    const result = await this.collection.deleteOne(filter);
    return result.deletedCount > 0;
  }
  async deleteMany(filter: any): Promise<boolean> {
    const result = await this.collection.deleteMany(filter);
    return result.deletedCount > 0;
  }
  async count(filter?: any): Promise<number> {
    return await this.collection.countDocuments(filter || {});
  }
  async getSettings(guildId: string): Promise<IGuildSettings> {
    const cacheKey = `settings:${guildId}`;
    let settings = this.cache.get(cacheKey);
    if (!settings) {
      settings = await this.findOne({ _id: parseInt(guildId) });
      if (!settings) {
        settings = await this.createDefaultSettings(guildId);
      }
      this.cache.set(cacheKey, settings, 300); 
    }
    return settings;
  }
  async updateSettings(guildId: string, data: any): Promise<boolean> {
    const result = await this.updateOne({ _id: parseInt(guildId) }, data);
    if (result) {
      this.cache.delete(`settings:${guildId}`);
    }
    return result;
  }
  async createDefaultSettings(guildId: string): Promise<IGuildSettings> {
    const settings: IGuildSettings = { _id: parseInt(guildId) };
    await this.insertOne(settings);
    return settings;
  }
}
class UserRepository implements IUserRepository {
  private collection: Collection<IUserData>;
  private cache: CacheManager<IUserData>;
  constructor(db: Db, cache: CacheManager<IUserData>) {
    this.collection = db.collection<IUserData>('Users');
    this.cache = cache;
  }
  async findOne(filter: any): Promise<IUserData | null> {
    return await this.collection.findOne(filter);
  }
  async findMany(filter: any, options?: any): Promise<IUserData[]> {
    return await this.collection.find(filter, options).toArray();
  }
  async insertOne(document: IUserData): Promise<boolean> {
    const result = await this.collection.insertOne(document);
    return result.acknowledged;
  }
  async insertMany(documents: IUserData[]): Promise<boolean> {
    const result = await this.collection.insertMany(documents);
    return result.acknowledged;
  }
  async updateOne(filter: any, update: any): Promise<boolean> {
    const result = await this.collection.updateOne(filter, update);
    return result.modifiedCount > 0;
  }
  async updateMany(filter: any, update: any): Promise<boolean> {
    const result = await this.collection.updateMany(filter, update);
    return result.modifiedCount > 0;
  }
  async deleteOne(filter: any): Promise<boolean> {
    const result = await this.collection.deleteOne(filter);
    return result.deletedCount > 0;
  }
  async deleteMany(filter: any): Promise<boolean> {
    const result = await this.collection.deleteMany(filter);
    return result.deletedCount > 0;
  }
  async count(filter?: any): Promise<number> {
    return await this.collection.countDocuments(filter || {});
  }
  async getUser(userId: string, dataType?: string): Promise<IUserData> {
    const cacheKey = `user:${userId}`;
    let user = this.cache.get(cacheKey);
    if (!user) {
      user = await this.findOne({ _id: parseInt(userId) });
      if (!user) {
        user = await this.createDefaultUser(userId);
      }
      this.cache.set(cacheKey, user, 300); 
    }
    return user;
  }
  async updateUser(userId: string, data: any): Promise<boolean> {
    const result = await this.updateOne({ _id: parseInt(userId) }, data);
    if (result) {
      this.cache.delete(`user:${userId}`);
    }
    return result;
  }
  async createDefaultUser(userId: string): Promise<IUserData> {
    const user: IUserData = {
      _id: parseInt(userId),
      playlist: {
        '200': {
          tracks: [],
          perms: { read: [], write: [], remove: [] },
          name: 'Favourite',
          type: 'playlist',
        },
      },
      history: [],
      inbox: [],
    };
    await this.insertOne(user);
    return user;
  }
  async getUserPlaylist(userId: string, playlistId: string): Promise<any> {
    const user = await this.getUser(userId);
    return user.playlist[playlistId] || null;
  }
  async updateUserPlaylist(userId: string, playlistId: string, data: any): Promise<boolean> {
    return await this.updateUser(userId, { [`playlist.${playlistId}`]: data });
  }
  async addToHistory(userId: string, track: any, guildId: string): Promise<boolean> {
    const historyEntry = {
      track,
      played_at: new Date(),
      guild_id: parseInt(guildId),
    };
    return await this.updateUser(userId, { $push: { history: { $each: [historyEntry], $slice: -50 } } });
  }
}
export class Database implements IDatabase {
  public connection: IDatabaseConnection;
  public settings: IGuildSettingsRepository;
  public users: IUserRepository;
  private db: Db;
  private cache: IDatabaseCache;
  constructor(private url: string, private dbName: string) {
    this.connection = new DatabaseConnection(url);
    this.cache = {
      settings: new CacheManager<IGuildSettings>(),
      users: new CacheManager<IUserData>(),
      clear: () => {
        this.cache.settings.clear();
        this.cache.users.clear();
      },
    };
  }
  async initialize(): Promise<void> {
    await this.connection.connect();
    if (this.connection.isConnected) {
      this.db = this.connection.client.db(this.dbName);
      this.settings = new GuildSettingsRepository(this.db, this.cache.settings);
      this.users = new UserRepository(this.db, this.cache.users);
      logger.info('Database repositories initialized successfully', 'database');
    } else {
      logger.warn('Database repositories not initialized - running in degraded mode', 'database');
    }
  }
  async close(): Promise<void> {
    this.cache.clear();
    await this.connection.disconnect();
  }
}
