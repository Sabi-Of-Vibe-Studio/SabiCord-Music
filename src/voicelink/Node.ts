/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

import WebSocket from 'ws';
import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';
import { Client } from 'discord.js';
import { SearchType, RequestMethod, NodeAlgorithm } from './Enums';
import { Track, Playlist, ITrackInfo, IPlaylistInfo } from './Track';
import { 
  NodeConnectionFailure, 
  NodeCreationError, 
  NodeNotAvailable, 
  NoNodesAvailable,
  TrackLoadError 
} from './Exceptions';
import { logger } from '@core/Logger';
import { Utils } from '@core/Utils';

export interface INodeOptions {
  identifier: string;
  host: string;
  port: number;
  password: string;
  secure?: boolean;
  heartbeat?: number;
  resumeKey?: string;
  ytRatelimit?: any;
}

export interface INodeStats {
  players: number;
  playingPlayers: number;
  uptime: number;
  memory: {
    free: number;
    used: number;
    allocated: number;
    reservable: number;
  };
  cpu: {
    cores: number;
    systemLoad: number;
    lavalinkLoad: number;
  };
  frameStats?: {
    sent: number;
    nulled: number;
    deficit: number;
  };
}

export interface INodeInfo {
  version: {
    semver: string;
    major: number;
    minor: number;
    patch: number;
    preRelease?: string;
    build?: string;
  };
  buildTime: number;
  git: {
    branch: string;
    commit: string;
    commitTime: number;
  };
  jvm: string;
  lavaplayer: string;
  sourceManagers: string[];
  filters: string[];
  plugins: Array<{
    name: string;
    version: string;
  }>;
}

export class Node extends EventEmitter {
  public readonly identifier: string;
  public readonly host: string;
  public readonly port: number;
  public readonly password: string;
  public readonly secure: boolean;
  public readonly heartbeat: number;
  public readonly resumeKey?: string;

  private _client: Client;
  private _websocket?: WebSocket;
  private _httpClient: AxiosInstance;
  private _available = false;
  private _reconnectAttempts = 0;
  private _maxReconnectAttempts = 5;
  private _reconnectDelay = 5000;
  private _stats?: INodeStats;
  private _info?: INodeInfo;
  private _players = new Map<string, any>();
  private _ping = 0;
  private _lastPing = Date.now();

  constructor(client: Client, options: INodeOptions) {
    super();
    
    this._client = client;
    this.identifier = options.identifier;
    this.host = options.host;
    this.port = options.port;
    this.password = options.password;
    this.secure = options.secure || false;
    this.heartbeat = options.heartbeat || 30000;
    this.resumeKey = options.resumeKey;

    this._httpClient = axios.create({
      baseURL: `http${this.secure ? 's' : ''}://${this.host}:${this.port}`,
      headers: {
        'Authorization': this.password,
        'User-Id': this._client.user?.id || '',
        'Client-Name': 'Vocard/2.0.0',
      },
      timeout: 10000,
    });
  }

  public async connect(): Promise<void> {
    if (this._available) {
      logger.info(`Node [${this.identifier}] is already connected`, 'voicelink');
      return;
    }

    try {
      const wsUrl = `ws${this.secure ? 's' : ''}://${this.host}:${this.port}/v4/websocket`;
      
      this._websocket = new WebSocket(wsUrl, {
        headers: {
          'Authorization': this.password,
          'User-Id': this._client.user?.id || '',
          'Client-Name': 'Vocard/2.0.0',
          'Resume-Key': this.resumeKey || '',
        },
      });

      this._websocket.on('open', this.onOpen.bind(this));
      this._websocket.on('message', this.onMessage.bind(this));
      this._websocket.on('close', this.onClose.bind(this));
      this._websocket.on('error', this.onError.bind(this));

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new NodeConnectionFailure(`Connection timeout for node ${this.identifier}`));
        }, 10000);

        this._websocket!.once('open', () => {
          clearTimeout(timeout);
          resolve();
        });

        this._websocket!.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

    } catch (error) {
      logger.error(`Failed to connect to node [${this.identifier}]`, error as Error, 'voicelink');
      throw new NodeConnectionFailure(`Failed to connect to node ${this.identifier}: ${error}`);
    }
  }

  public async disconnect(): Promise<void> {
    if (!this._available) return;

    this._available = false;
    this._websocket?.close();
    this._players.clear();
    
    logger.info(`Node [${this.identifier}] disconnected`, 'voicelink');
    this.emit('disconnect');
  }

  public async send(method: RequestMethod, endpoint = '', data?: any, query?: string): Promise<any> {
    if (!this._available && method !== RequestMethod.GET) {
      throw new NodeNotAvailable(`Node ${this.identifier} is not available`);
    }

    try {
      const url = `/v4/${endpoint}${query ? `?${query}` : ''}`;
      
      let response;
      switch (method) {
        case RequestMethod.GET:
          response = await this._httpClient.get(url);
          break;
        case RequestMethod.POST:
          response = await this._httpClient.post(url, data);
          break;
        case RequestMethod.PATCH:
          response = await this._httpClient.patch(url, data);
          break;
        case RequestMethod.DELETE:
          response = await this._httpClient.delete(url);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      return response.data;
    } catch (error) {
      logger.error(`HTTP request failed for node [${this.identifier}]`, error as Error, 'voicelink');
      throw error;
    }
  }

  public async getTracks(query: string, requester: any, searchType: SearchType = SearchType.YOUTUBE): Promise<Track[] | Playlist | null> {
    try {
      const isUrl = Utils.isValidUrl(query);
      const searchQuery = isUrl ? query : `${searchType}:${query}`;
      
      const response = await this.send(RequestMethod.GET, 'loadtracks', undefined, `identifier=${encodeURIComponent(searchQuery)}`);
      
      if (!response || response.loadType === 'empty') {
        return null;
      }

      if (response.loadType === 'error') {
        throw new TrackLoadError(response.data?.message || 'Failed to load tracks');
      }

      if (response.loadType === 'playlist') {
        return new Playlist({
          playlistInfo: response.data.info as IPlaylistInfo,
          tracks: response.data.tracks,
          requester,
          searchType,
        });
      }

      // Track or search result
      const tracks = response.data.map((trackData: any) => 
        new Track({
          trackId: trackData.encoded,
          info: trackData.info as ITrackInfo,
          requester,
          searchType,
        })
      );

      return tracks;
    } catch (error) {
      logger.error(`Failed to get tracks from node [${this.identifier}]`, error as Error, 'voicelink');
      throw error;
    }
  }

  private onOpen(): void {
    this._available = true;
    this._reconnectAttempts = 0;
    
    logger.info(`Node [${this.identifier}] connected successfully`, 'voicelink');
    
    // Get node info
    this.send(RequestMethod.GET, 'info')
      .then(info => {
        this._info = info;
        logger.debug(`Node [${this.identifier}] info loaded`, 'voicelink');
      })
      .catch(error => {
        logger.error(`Failed to get node info for [${this.identifier}]`, error, 'voicelink');
      });

    this.emit('connect');
  }

  private onMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.op) {
        case 'stats':
          this._stats = message;
          break;
        case 'playerUpdate':
          this.handlePlayerUpdate(message);
          break;
        case 'event':
          this.handleEvent(message);
          break;
        case 'pong':
          this._ping = Date.now() - this._lastPing;
          break;
      }
    } catch (error) {
      logger.error(`Failed to parse WebSocket message from node [${this.identifier}]`, error as Error, 'voicelink');
    }
  }

  private onClose(code: number, reason: Buffer): void {
    this._available = false;
    logger.warn(`Node [${this.identifier}] connection closed: ${code} ${reason.toString()}`, 'voicelink');
    
    if (this._reconnectAttempts < this._maxReconnectAttempts) {
      this.reconnect();
    } else {
      logger.error(`Max reconnection attempts reached for node [${this.identifier}]`, undefined, 'voicelink');
      this.emit('disconnect');
    }
  }

  private onError(error: Error): void {
    logger.error(`WebSocket error for node [${this.identifier}]`, error, 'voicelink');
  }

  private async reconnect(): Promise<void> {
    this._reconnectAttempts++;
    const delay = this._reconnectDelay * Math.pow(2, this._reconnectAttempts - 1);
    
    logger.info(`Attempting to reconnect to node [${this.identifier}] (attempt ${this._reconnectAttempts}/${this._maxReconnectAttempts})`, 'voicelink');
    
    await Utils.sleep(delay);
    
    try {
      await this.connect();
    } catch (error) {
      logger.error(`Reconnection attempt ${this._reconnectAttempts} failed for node [${this.identifier}]`, error as Error, 'voicelink');
    }
  }

  private handlePlayerUpdate(message: any): void {
    const player = this._players.get(message.guildId);
    if (player) {
      player.handlePlayerUpdate(message);
    }
  }

  private handleEvent(message: any): void {
    const player = this._players.get(message.guildId);
    if (player) {
      player.handleEvent(message);
    }
  }

  // Getters
  public get available(): boolean {
    return this._available;
  }

  public get stats(): INodeStats | undefined {
    return this._stats;
  }

  public get info(): INodeInfo | undefined {
    return this._info;
  }

  public get ping(): number {
    return this._ping;
  }

  public get playerCount(): number {
    return this._players.size;
  }

  public get players(): Map<string, any> {
    return this._players;
  }
}

export class NodePool {
  private static _nodes = new Map<string, Node>();

  public static addNode(node: Node): void {
    if (this._nodes.has(node.identifier)) {
      throw new NodeCreationError(`Node with identifier '${node.identifier}' already exists`);
    }

    this._nodes.set(node.identifier, node);
    logger.info(`Node [${node.identifier}] added to pool`, 'voicelink');
  }

  public static removeNode(identifier: string): boolean {
    const node = this._nodes.get(identifier);
    if (node) {
      node.disconnect();
      this._nodes.delete(identifier);
      logger.info(`Node [${identifier}] removed from pool`, 'voicelink');
      return true;
    }
    return false;
  }

  public static getNode(identifier?: string): Node {
    if (identifier) {
      const node = this._nodes.get(identifier);
      if (!node) {
        throw new NodeNotAvailable(`Node '${identifier}' not found`);
      }
      if (!node.available) {
        throw new NodeNotAvailable(`Node '${identifier}' is not available`);
      }
      return node;
    }

    // Get any available node
    const availableNodes = Array.from(this._nodes.values()).filter(node => node.available);
    if (availableNodes.length === 0) {
      throw new NoNodesAvailable('No nodes are currently available');
    }

    // Return node with least players
    return availableNodes.reduce((best, current) =>
      current.playerCount < best.playerCount ? current : best
    );
  }

  public static getBestNode(algorithm: NodeAlgorithm = NodeAlgorithm.BY_PLAYERS): Node {
    const availableNodes = Array.from(this._nodes.values()).filter(node => node.available);

    if (availableNodes.length === 0) {
      throw new NoNodesAvailable('No nodes are currently available');
    }

    switch (algorithm) {
      case NodeAlgorithm.BY_PING:
        return availableNodes.reduce((best, current) =>
          current.ping < best.ping ? current : best
        );

      case NodeAlgorithm.BY_PLAYERS:
        return availableNodes.reduce((best, current) =>
          current.playerCount < best.playerCount ? current : best
        );

      default:
        return availableNodes[0];
    }
  }

  public static async createNode(client: Client, options: INodeOptions): Promise<Node> {
    const node = new Node(client, options);
    await node.connect();
    this.addNode(node);
    return node;
  }

  public static get nodes(): Map<string, Node> {
    return this._nodes;
  }

  public static get availableNodes(): Node[] {
    return Array.from(this._nodes.values()).filter(node => node.available);
  }

  public static async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this._nodes.values()).map(node => node.disconnect());
    await Promise.all(disconnectPromises);
    this._nodes.clear();
    logger.info('All nodes disconnected', 'voicelink');
  }
}
