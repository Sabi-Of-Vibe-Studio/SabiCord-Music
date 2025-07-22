/**
 * MIT License
 *
 * Copyright (c) 2025 NirrussVn0
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { Client, Guild } from 'discord.js';
import { getPlayer } from '../audio/index';
import { logger } from '../core/Logger';
import { container } from 'tsyringe';
import { Settings } from '../core/Settings';
import { Database } from '../core/Database';
export interface IIPCMessage {
  op: string;
  d: any;
  t?: string;
  s?: number | undefined;
}
export interface IIPCRequest {
  method: string;
  endpoint: string;
  data?: any;
  headers?: Record<string, string>;
}
export interface IIPCResponse {
  status: number;
  data?: any;
  error?: string;
}
export class IPCClient extends EventEmitter {
  private readonly client: Client;
  private readonly settings: Settings;
  private readonly database: Database;
  private websocket?: WebSocket | undefined;
  private connected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 5000;
  private heartbeatInterval?: ReturnType<typeof setInterval> | undefined;
  private readonly startTime = Date.now();
  constructor(client: Client) {
    super();
    this.client = client;
    this.settings = container.resolve<Settings>('Settings');
    this.database = container.resolve<Database>('Database');
  }
  public async connect(): Promise<void> {
    if (!this.settings.ipc_client.enable) {
      logger.info('IPC client is disabled', 'ipc');
      return;
    }
    const { host, port, password, secure } = this.settings.ipc_client;
    const protocol = secure ? 'wss' : 'ws';
    const url = `${protocol}://${host}:${port}`;
    try {
      this.websocket = new WebSocket(url, {
        headers: {
          'Authorization': password,
          'User-Id': this.client.user?.id || '',
          'Client-Name': 'Vocard-Bot',
        },
      });
      this.websocket.on('open', this.onOpen.bind(this));
      this.websocket.on('message', this.onMessage.bind(this));
      this.websocket.on('close', this.onClose.bind(this));
      this.websocket.on('error', this.onError.bind(this));
      logger.info('Attempting to connect to IPC server...', 'ipc');
    } catch (error) {
      logger.error('Failed to create IPC connection', error as Error, 'ipc');
      throw error;
    }
  }
  public async disconnect(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    if (this.websocket) {
      this.websocket.close();
      this.websocket = undefined;
    }
    this.connected = false;
    logger.info('IPC client disconnected', 'ipc');
  }
  private onOpen(): void {
    this.connected = true;
    this.reconnectAttempts = 0;
    logger.info('IPC client connected successfully', 'ipc');
    this.send({
      op: 'READY',
      d: {
        bot: {
          id: this.client.user?.id,
          username: this.client.user?.username,
          discriminator: this.client.user?.discriminator,
          avatar: this.client.user?.avatar,
        },
        guilds: this.client.guilds.cache.size,
        users: this.client.users.cache.size,
        uptime: Date.now() - this.startTime,
      },
    });
    this.startHeartbeat();
    super.emit('connect');
  }
  private onMessage(data: WebSocket.Data): void {
    try {
      const message: IIPCMessage = JSON.parse(data.toString());
      this.handleMessage(message);
    } catch (error) {
      logger.error('Failed to parse IPC message', error as Error, 'ipc');
    }
  }
  private onClose(code: number, reason: string): void {
    this.connected = false;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    logger.warn(`IPC connection closed: ${code} ${reason}`, 'ipc');
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnect();
    } else {
      logger.error('Max IPC reconnection attempts reached', undefined, 'ipc');
      super.emit('disconnect');
    }
  }
  private onError(error: Error): void {
    logger.error('IPC WebSocket error', error, 'ipc');
  }
  private async reconnect(): Promise<void> {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    logger.info(`Attempting to reconnect to IPC server (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'ipc');
    setTimeout(() => {
      this.connect().catch(error => {
        logger.error(`IPC reconnection attempt ${this.reconnectAttempts} failed`, error, 'ipc');
      });
    }, delay);
  }
  private async handleMessage(message: IIPCMessage): Promise<void> {
    switch (message.op) {
      case 'REQUEST':
        await this.handleRequest(message);
        break;
      case 'HEARTBEAT':
        this.send({ op: 'HEARTBEAT_ACK', d: null });
        break;
      case 'HELLO':
        logger.debug('Received IPC hello', 'ipc');
        break;
      default:
        logger.debug(`Unknown IPC operation: ${message.op}`, 'ipc');
    }
  }
  private async handleRequest(message: IIPCMessage): Promise<void> {
    const request: IIPCRequest = message.d;
    let response: IIPCResponse;
    try {
      response = await this.processRequest(request);
    } catch (error) {
      logger.error('Error processing IPC request', error as Error, 'ipc');
      response = {
        status: 500,
        error: 'Internal server error',
      };
    }
    this.send({
      op: 'RESPONSE',
      d: response,
      s: message.s ?? undefined,
    });
  }
  private async processRequest(request: IIPCRequest): Promise<IIPCResponse> {
    const { method, endpoint, data } = request;
    logger.debug(`IPC Request: ${method} ${endpoint}`, 'ipc');
    const parts = endpoint.split('/').filter(Boolean);
    const resource = parts[0];
    switch (resource) {
      case 'guilds':
        return await this.handleGuildRequest(method, parts.slice(1), data);
      case 'players':
        return await this.handlePlayerRequest(method, parts.slice(1), data);
      case 'users':
        return await this.handleUserRequest(method, parts.slice(1), data);
      case 'stats':
        return await this.handleStatsRequest(method, parts.slice(1), data);
      default:
        return { status: 404, error: 'Endpoint not found' };
    }
  }
  private async handleGuildRequest(method: string, parts: string[], _data: any): Promise<IIPCResponse> {
    if (method === 'GET' && parts.length === 0) {
      const guilds = this.client.guilds.cache.map((guild: Guild) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL(),
        memberCount: guild.memberCount,
        owner: guild.ownerId,
      }));
      return { status: 200, data: guilds };
    }
    if (method === 'GET' && parts.length === 1) {
      const guildId = parts[0];
      if (!guildId) {
        return { status: 400, error: 'Guild ID is required' };
      }
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        return { status: 404, error: 'Guild not found' };
      }
      const guildData = {
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL(),
        memberCount: guild.memberCount,
        owner: guild.ownerId,
        channels: guild.channels.cache.size,
        roles: guild.roles.cache.size,
        createdAt: guild.createdAt,
      };
      return { status: 200, data: guildData };
    }
    return { status: 405, error: 'Method not allowed' };
  }
  private async handlePlayerRequest(method: string, parts: string[], data: any): Promise<IIPCResponse> {
    if (method === 'GET' && parts.length === 0) {
      const players = this.client.guilds.cache
        .map((guild: Guild) => {
          const player = getPlayer(guild.id);
          if (!player) return null;
          return {
            guildId: guild.id,
            guildName: guild.name,
            channelId: player.channel.id,
            channelName: player.channel.name,
            isPlaying: player.playing,
            isPaused: player.isPaused,
            current: player.current ? {
              title: player.current.title,
              author: player.current.author,
              uri: player.current.uri,
              length: player.current.length,
              position: 0,
            } : null,
            queueSize: player.queue.size(),
            volume: player.currentVolume,
          };
        })
        .filter(Boolean);
      return { status: 200, data: players };
    }
    if (method === 'GET' && parts.length === 1) {
      const guildId = parts[0];
      if (!guildId) {
        return { status: 400, error: 'Guild ID is required' };
      }
      const player = getPlayer(guildId);
      if (!player) {
        return { status: 404, error: 'Player not found' };
      }
      const playerData = {
        guildId: player.guild.id,
        guildName: player.guild.name,
        channelId: player.channel.id,
        channelName: player.channel.name,
        isPlaying: player.playing,
        isPaused: player.isPaused,
        current: player.current ? {
          title: player.current.title,
          author: player.current.author,
          uri: player.current.uri,
          length: player.current.length,
          position: 0,
          thumbnail: player.current.thumbnail,
        } : null,
        queue: player.queue.getTracks().slice(0, 10).map((track) => ({
          title: track.title,
          author: track.author,
          uri: track.uri,
          length: track.length,
        })),
        queueSize: player.queue.size(),
        volume: player.currentVolume,
        repeatMode: player.loopMode,
      };
      return { status: 200, data: playerData };
    }
    if (method === 'POST' && parts.length === 2 && parts[1] === 'control') {
      const guildId = parts[0];
      if (!guildId) {
        return { status: 400, error: 'Guild ID is required' };
      }
      const player = getPlayer(guildId);
      if (!player) {
        return { status: 404, error: 'Player not found' };
      }
      const { action } = data;
      switch (action) {
        case 'pause':
          await player.pause();
          break;
        case 'resume':
          await player.resume();
          break;
        case 'skip':
          await player.stop();
          break;
        case 'stop':
          await player.stop();
          player.queue.clear();
          break;
        case 'volume':
          if (data.volume !== undefined) {
            await player.setVolume(data.volume);
          }
          break;
        default:
          return { status: 400, error: 'Invalid action' };
      }
      return { status: 200, data: { success: true } };
    }
    return { status: 405, error: 'Method not allowed' };
  }
  private async handleUserRequest(method: string, parts: string[], _data: any): Promise<IIPCResponse> {
    if (method === 'GET' && parts.length === 1) {
      const userId = parts[0];
      if (!userId) {
        return { status: 400, error: 'User ID is required' };
      }
      try {
        const userData = await this.database.users.getUser(userId);
        return { status: 200, data: userData };
      } catch (error) {
        return { status: 500, error: 'Failed to fetch user data' };
      }
    }
    return { status: 405, error: 'Method not allowed' };
  }
  private async handleStatsRequest(method: string, parts: string[], _data: any): Promise<IIPCResponse> {
    if (method === 'GET' && parts.length === 0) {
      const stats = {
        guilds: this.client.guilds.cache.size,
        users: this.client.users.cache.size,
        channels: this.client.channels.cache.size,
        uptime: Date.now() - this.startTime,
        memory: { rss: 0, heapUsed: 0, heapTotal: 0, external: 0, arrayBuffers: 0 },
        activePlayers: this.client.guilds.cache.filter((guild: Guild) => getPlayer(guild.id)).size,
        ping: this.client.ws.ping,
      };
      return { status: 200, data: stats };
    }
    return { status: 405, error: 'Method not allowed' };
  }
  private send(message: IIPCMessage): void {
    if (!this.connected || !this.websocket) return;
    try {
      this.websocket.send(JSON.stringify(message));
    } catch (error) {
      logger.error('Failed to send IPC message', error as Error, 'ipc');
    }
  }
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({ op: 'HEARTBEAT', d: Date.now() });
    }, 30000); 
  }
  public get isConnected(): boolean {
    return this.connected;
  }
}
