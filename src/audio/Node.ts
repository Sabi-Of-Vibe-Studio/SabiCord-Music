/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import { Client } from 'discord.js';
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import axios, { AxiosInstance } from 'axios';
import { RequestMethod, NodeAlgorithm, LoadType } from './Enums';
import { NodeException, NodeConnectionFailure, NodeNotAvailable } from './Exceptions';
import { Track, Playlist } from './Track';
import { Player } from './Player';
import { ILogger } from '../core/Logger';
import { container } from 'tsyringe';
export interface INodeOptions {
  identifier: string;
  host: string;
  port: number;
  password: string;
  secure?: boolean;
  heartbeat?: number;
  resumeKey?: string;
  region?: string;
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
export class Node extends EventEmitter {
  private readonly client: Client;
  private readonly httpClient: AxiosInstance;
  private readonly logger: ILogger;
  private websocket?: WebSocket;
  private players = new Map<string, Player>();
  private stats?: INodeStats;
  private available = false;
  private reconnectAttempts = 0;
  private heartbeatInterval?: ReturnType<typeof setInterval> | undefined;
  public readonly identifier: string;
  public readonly host: string;
  public readonly port: number;
  public readonly password: string;
  public readonly secure: boolean;
  public readonly heartbeat: number;
  public readonly resumeKey?: string | undefined;
  public readonly region?: string | undefined;
  constructor(client: Client, options: INodeOptions) {
    super();
    this.client = client;
    this.identifier = options.identifier;
    this.host = options.host;
    this.port = options.port;
    this.password = options.password;
    this.secure = options.secure || false;
    this.heartbeat = options.heartbeat || 30000;
    this.resumeKey = options.resumeKey;
    this.region = options.region;
    this.logger = container.resolve<ILogger>('Logger');
    this.httpClient = axios.create({
      baseURL: `http${this.secure ? 's' : ''}://${this.host}:${this.port}/v4`,
      headers: {
        'Authorization': this.password,
        'User-Id': this.client.user?.id || '',
        'Client-Name': 'SabiCord/2.0.0',
      },
      timeout: 10000,
    });
  }
  public get isAvailable(): boolean {
    return this.available;
  }
  public get nodeStats(): INodeStats | undefined {
    return this.stats;
  }
  public get playerCount(): number {
    return this.players.size;
  }
  public get playingPlayerCount(): number {
    return Array.from(this.players.values()).filter(p => p.playing).length;
  }
  public async connect(): Promise<void> {
    if (this.available) {
      this.logger.info(`Node [${this.identifier}] is already connected`, 'audio');
      return;
    }
    try {
      const wsUrl = `ws${this.secure ? 's' : ''}://${this.host}:${this.port}/v4/websocket`;
      this.websocket = new WebSocket(wsUrl, {
        headers: {
          'Authorization': this.password,
          'User-Id': this.client.user?.id || '',
          'Client-Name': 'SabiCord/2.0.0',
          'Resume-Key': this.resumeKey || '',
        },
      });
      this.setupWebSocketHandlers();
      await this.waitForConnection();
      this.available = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.logger.info(`Node [${this.identifier}] connected successfully`, 'audio');
      this.emit('connect');
    } catch (error) {
      this.logger.error(`Failed to connect to node [${this.identifier}]`, error as Error, 'audio');
      throw new NodeConnectionFailure(`Failed to connect to node ${this.identifier}: ${error}`);
    }
  }
  public async disconnect(): Promise<void> {
    if (!this.available) return;
    this.available = false;
    this.stopHeartbeat();
    this.websocket?.close();
    this.players.clear();
    this.logger.info(`Node [${this.identifier}] disconnected`, 'audio');
    this.emit('disconnect');
  }
  public async send(method: RequestMethod, endpoint = '', data?: any, query?: string): Promise<any> {
    if (!this.available && method !== RequestMethod.GET) {
      throw new NodeNotAvailable(`Node ${this.identifier} is not available`);
    }
    try {
      const url = endpoint + (query ? `?${query}` : '');
      const response = await this.httpClient.request({
        method,
        url,
        data,
      });
      return response.data;
    } catch (error) {
      this.logger.error(`HTTP request failed for node [${this.identifier}]`, error as Error, 'audio');
      throw new NodeException(`HTTP request failed: ${error}`);
    }
  }
  public async search(query: string, requester: any): Promise<any> {
    const response = await this.send(RequestMethod.GET, 'loadtracks', null, `identifier=${encodeURIComponent(query)}`);
    if (response.loadType === LoadType.ERROR) {
      throw new NodeException(`Search failed: ${response.data?.message || 'Unknown error'}`);
    }
    if (response.loadType === LoadType.EMPTY) {
      return { tracks: [], playlist: null };
    }
    const tracks = response.data.map((trackData: any) => new Track({
      trackId: trackData.encoded,
      info: trackData.info,
      requester,
    }));
    if (response.loadType === LoadType.PLAYLIST) {
      return {
        tracks,
        playlist: new Playlist({
          name: response.playlistInfo.name,
          tracks,
          selectedTrack: response.playlistInfo.selectedTrack,
          requester,
          source: 'unknown',
        }),
      };
    }
    return { tracks, playlist: null };
  }
  public addPlayer(player: Player): void {
    this.players.set(player.guild.id, player);
  }
  public removePlayer(guildId: string): void {
    this.players.delete(guildId);
  }
  public getPlayer(guildId: string): Player | undefined {
    return this.players.get(guildId);
  }
  public hasPlayer(guildId: string): boolean {
    return this.players.has(guildId);
  }
  public getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }
  private setupWebSocketHandlers(): void {
    if (!this.websocket) return;
    this.websocket.on('open', () => {
      this.logger.debug(`WebSocket connection opened for node [${this.identifier}]`, 'audio');
    });
    this.websocket.on('message', (data) => {
      this.handleWebSocketMessage(data);
    });
    this.websocket.on('close', (code, reason) => {
      this.logger.warn(`WebSocket connection closed for node [${this.identifier}]: ${code} ${reason}`, 'audio');
      this.handleDisconnection();
    });
    this.websocket.on('error', (error) => {
      this.logger.error(`WebSocket error for node [${this.identifier}]`, error, 'audio');
      this.emit('error', error);
    });
  }
  private handleWebSocketMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      switch (message.op) {
        case 'ready':
          this.handleReadyMessage(message);
          break;
        case 'stats':
          this.handleStatsMessage(message);
          break;
        case 'event':
          this.handleEventMessage(message);
          break;
        case 'playerUpdate':
          this.handlePlayerUpdateMessage(message);
          break;
        default:
          this.logger.debug(`Unknown message type: ${message.op}`, 'audio');
      }
    } catch (error) {
      this.logger.error(`Failed to parse WebSocket message`, error as Error, 'audio');
    }
  }
  private handleReadyMessage(_message: any): void {
    this.logger.debug(`Node [${this.identifier}] is ready`, 'audio');
    this.emit('ready');
  }
  private handleStatsMessage(message: any): void {
    this.stats = message;
    this.emit('stats', this.stats);
  }
  private handleEventMessage(message: any): void {
    const player = this.players.get(message.guildId);
    if (player) {
      player.emit('event', message);
    }
  }
  private handlePlayerUpdateMessage(message: any): void {
    const player = this.players.get(message.guildId);
    if (player) {
      player.emit('playerUpdate', message.state);
    }
  }
  private async handleDisconnection(): Promise<void> {
    this.available = false;
    this.stopHeartbeat();
    if (this.reconnectAttempts < 5) {
      this.reconnectAttempts++;
      this.logger.info(`Attempting to reconnect to node [${this.identifier}] (${this.reconnectAttempts}/5)`, 'audio');
      setTimeout(() => {
        this.connect().catch(() => {
          this.logger.error(`Reconnection attempt ${this.reconnectAttempts} failed for node [${this.identifier}]`, undefined, 'audio');
        });
      }, 5000 * this.reconnectAttempts);
    } else {
      this.logger.error(`Max reconnection attempts reached for node [${this.identifier}]`, undefined, 'audio');
      this.emit('disconnect');
    }
  }
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);
      this.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });
      this.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.websocket?.readyState === WebSocket.OPEN) {
        this.websocket.ping();
      }
    }, this.heartbeat);
  }
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }
}
export class NodePool {
  private static nodes = new Map<string, Node>();
  private static algorithm: NodeAlgorithm = NodeAlgorithm.BY_PING;
  public static addNode(node: Node): void {
    this.nodes.set(node.identifier, node);
  }
  public static removeNode(identifier: string): void {
    const node = this.nodes.get(identifier);
    if (node) {
      node.disconnect();
      this.nodes.delete(identifier);
    }
  }
  public static getNode(identifier?: string): Node {
    if (identifier) {
      const node = this.nodes.get(identifier);
      if (!node) {
        throw new NodeNotAvailable(`Node ${identifier} not found`);
      }
      return node;
    }
    const availableNodes = this.availableNodes;
    if (availableNodes.length === 0) {
      throw new NodeNotAvailable('No available nodes');
    }
    return this.selectOptimalNode(availableNodes);
  }
  public static getPlayer(guildId: string): Player | null {
    for (const node of this.nodes.values()) {
      const player = node.getPlayer(guildId);
      if (player) {
        return player;
      }
    }
    return null;
  }
  public static hasPlayer(guildId: string): boolean {
    return this.getPlayer(guildId) !== null;
  }
  public static async createNode(client: Client, options: INodeOptions): Promise<Node> {
    const node = new Node(client, options);
    await node.connect();
    this.addNode(node);
    return node;
  }
  public static get allNodes(): Map<string, Node> {
    return this.nodes;
  }
  public static get availableNodes(): Node[] {
    return Array.from(this.nodes.values()).filter(node => node.isAvailable);
  }
  public static async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.nodes.values()).map(node => node.disconnect());
    await Promise.all(disconnectPromises);
    this.nodes.clear();
  }
  public static setAlgorithm(algorithm: NodeAlgorithm): void {
    this.algorithm = algorithm;
  }
  private static selectOptimalNode(nodes: Node[]): Node {
    switch (this.algorithm) {
      case NodeAlgorithm.BY_PLAYERS:
        return nodes.reduce((prev, current) => 
          prev.playerCount < current.playerCount ? prev : current
        );
      case NodeAlgorithm.BY_REGION:
        return nodes[0]!;
      case NodeAlgorithm.BY_PING:
      default:
        return nodes[0]!;
    }
  }
}
