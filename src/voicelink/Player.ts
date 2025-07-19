/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

import { 
  VoiceChannel, 
  Guild, 
  User, 
  VoiceConnection,
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
  DiscordGatewayAdapterCreator
} from 'discord.js';
import { EventEmitter } from 'events';
import { Track, Playlist } from './Track';
import { Queue, FairQueue } from './Queue';
import { Filters } from './Filters';
import { Node, NodePool } from './Node';
import { SearchType, LoopType, RequestMethod, PlayerState, TrackEndReason } from './Enums';
import { 
  PlayerNotConnected, 
  PlayerAlreadyConnected, 
  InvalidChannelPermissions,
  VoicelinkException 
} from './Exceptions';
import { logger } from '@core/Logger';
import { Utils } from '@core/Utils';
import { container } from 'tsyringe';
import { Database } from '@core/Database';

export interface IPlayerOptions {
  guild: Guild;
  channel: VoiceChannel;
  node?: Node;
  volume?: number;
  maxQueueSize?: number;
  allowDuplicate?: boolean;
  queueType?: 'Queue' | 'FairQueue';
}

export interface IPlayerEvents {
  trackStart: [player: Player, track: Track];
  trackEnd: [player: Player, track: Track, reason: TrackEndReason];
  trackException: [player: Player, track: Track, exception: any];
  trackStuck: [player: Player, track: Track, threshold: number];
  playerUpdate: [player: Player, state: any];
  playerDestroy: [player: Player];
  queueEnd: [player: Player];
}

export class Player extends EventEmitter {
  public readonly guild: Guild;
  public readonly channel: VoiceChannel;
  public readonly node: Node;
  public readonly queue: Queue;
  public readonly joinTime: number;

  private _connection?: VoiceConnection;
  private _current?: Track;
  private _filters: Filters;
  private _volume = 100;
  private _paused = false;
  private _connected = false;
  private _position = 0;
  private _lastPosition = 0;
  private _lastUpdate = 0;
  private _ping = 0;
  private _state: PlayerState = PlayerState.IDLE;

  // Voting system
  public readonly pauseVotes = new Set<User>();
  public readonly resumeVotes = new Set<User>();
  public readonly skipVotes = new Set<User>();
  public readonly stopVotes = new Set<User>();
  public readonly shuffleVotes = new Set<User>();
  public readonly previousVotes = new Set<User>();

  // Settings
  private _autoplay = false;
  private _autoLeave = true;
  private _autoLeaveDelay = 60000; // 1 minute

  constructor(options: IPlayerOptions) {
    super();

    this.guild = options.guild;
    this.channel = options.channel;
    this.node = options.node || NodePool.getNode();
    this.joinTime = Date.now();
    this._volume = options.volume || 100;

    // Initialize queue
    const QueueClass = options.queueType === 'FairQueue' ? FairQueue : Queue;
    this.queue = new QueueClass({
      maxSize: options.maxQueueSize || 1000,
      allowDuplicate: options.allowDuplicate !== false,
    });

    this._filters = new Filters();

    // Add player to node
    this.node.players.set(this.guild.id, this);

    logger.debug(`Player created for guild ${this.guild.name} (${this.guild.id})`, 'voicelink');
  }

  public async connect(): Promise<void> {
    if (this._connected) {
      throw new PlayerAlreadyConnected('Player is already connected');
    }

    // Check permissions
    const permissions = this.channel.permissionsFor(this.guild.members.me!);
    if (!permissions?.has(['Connect', 'Speak'])) {
      throw new InvalidChannelPermissions('Missing Connect or Speak permissions');
    }

    try {
      this._connection = joinVoiceChannel({
        channelId: this.channel.id,
        guildId: this.guild.id,
        adapterCreator: this.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
        selfDeaf: true,
        selfMute: false,
      });

      // Wait for connection to be ready
      await entersState(this._connection, VoiceConnectionStatus.Ready, 30000);

      this._connected = true;
      this._state = PlayerState.IDLE;

      // Send player create to Lavalink
      await this.node.send(RequestMethod.PATCH, `sessions/${this.node.identifier}/players/${this.guild.id}`, {
        voice: {
          token: this._connection.joinConfig.token,
          endpoint: this._connection.joinConfig.endpoint,
          sessionId: this._connection.joinConfig.sessionId,
        },
      });

      // Set initial volume
      if (this._volume !== 100) {
        await this.setVolume(this._volume);
      }

      logger.debug(`Player connected to ${this.channel.name} in ${this.guild.name}`, 'voicelink');
      this.emit('connect');

    } catch (error) {
      logger.error(`Failed to connect player in ${this.guild.name}`, error as Error, 'voicelink');
      throw new PlayerNotConnected(`Failed to connect to voice channel: ${error}`);
    }
  }

  public async disconnect(): Promise<void> {
    if (!this._connected) return;

    try {
      // Stop current track
      if (this._current) {
        await this.stop();
      }

      // Destroy player on Lavalink
      await this.node.send(RequestMethod.DELETE, `sessions/${this.node.identifier}/players/${this.guild.id}`);

      // Disconnect from voice channel
      this._connection?.destroy();
      this._connection = undefined;

      this._connected = false;
      this._state = PlayerState.DESTROYED;

      // Remove from node
      this.node.players.delete(this.guild.id);

      logger.debug(`Player disconnected from ${this.guild.name}`, 'voicelink');
      this.emit('disconnect');

    } catch (error) {
      logger.error(`Error disconnecting player from ${this.guild.name}`, error as Error, 'voicelink');
    }
  }

  public async play(track: Track, options: { start?: number; end?: number; noReplace?: boolean } = {}): Promise<void> {
    if (!this._connected) {
      throw new PlayerNotConnected('Player is not connected');
    }

    const data: any = {
      encodedTrack: track.trackId,
    };

    if (options.start || track.position) {
      data.position = options.start || track.position;
    }

    if (options.end || track.endTime) {
      data.endTime = options.end || track.endTime;
    }

    const query = options.noReplace ? 'noReplace=true' : '';

    await this.node.send(RequestMethod.PATCH, `sessions/${this.node.identifier}/players/${this.guild.id}`, data, query);

    this._current = track;
    this._state = PlayerState.PLAYING;
    this._paused = false;

    // Clear votes
    this.clearVotes();

    // Add to user history
    if (!track.requester.bot) {
      try {
        const database = container.resolve<Database>('Database');
        await database.users.addToHistory(track.requester.id, track.data, this.guild.id);
      } catch (error) {
        logger.error('Failed to add track to user history', error as Error, 'voicelink');
      }
    }

    logger.debug(`Playing ${track.title} in ${this.guild.name}`, 'voicelink');
  }

  public async stop(): Promise<void> {
    if (!this._connected) return;

    await this.node.send(RequestMethod.PATCH, `sessions/${this.node.identifier}/players/${this.guild.id}`, {
      encodedTrack: null,
    });

    this._current = undefined;
    this._state = PlayerState.STOPPED;
    this.clearVotes();
  }

  public async pause(): Promise<void> {
    if (!this._connected || this._paused) return;

    await this.node.send(RequestMethod.PATCH, `sessions/${this.node.identifier}/players/${this.guild.id}`, {
      paused: true,
    });

    this._paused = true;
    this._state = PlayerState.PAUSED;
    this.clearVotes();
  }

  public async resume(): Promise<void> {
    if (!this._connected || !this._paused) return;

    await this.node.send(RequestMethod.PATCH, `sessions/${this.node.identifier}/players/${this.guild.id}`, {
      paused: false,
    });

    this._paused = false;
    this._state = PlayerState.PLAYING;
    this.clearVotes();
  }

  public async seek(position: number): Promise<void> {
    if (!this._connected || !this._current) return;

    await this.node.send(RequestMethod.PATCH, `sessions/${this.node.identifier}/players/${this.guild.id}`, {
      position,
    });

    this._position = position;
  }

  public async setVolume(volume: number): Promise<void> {
    if (volume < 0 || volume > 1000) {
      throw new VoicelinkException('Volume must be between 0 and 1000');
    }

    if (!this._connected) {
      this._volume = volume;
      return;
    }

    await this.node.send(RequestMethod.PATCH, `sessions/${this.node.identifier}/players/${this.guild.id}`, {
      volume,
    });

    this._volume = volume;
  }

  public async setFilters(filters: Filters): Promise<void> {
    if (!this._connected) {
      this._filters = filters;
      return;
    }

    await this.node.send(RequestMethod.PATCH, `sessions/${this.node.identifier}/players/${this.guild.id}`, {
      filters: filters.toJSON(),
    });

    this._filters = filters;
  }

  public async setRepeat(mode: LoopType): Promise<void> {
    this.queue.setRepeat(mode);
  }

  public async getTracks(query: string, options: { requester?: User; searchType?: SearchType } = {}): Promise<Track[] | Playlist | null> {
    const requester = options.requester || this.guild.members.me?.user!;
    const searchType = options.searchType || SearchType.YOUTUBE;
    
    return await this.node.getTracks(query, requester, searchType);
  }

  public async addTrack(track: Track | Track[], options: { atFront?: boolean; startTime?: number; endTime?: number } = {}): Promise<number> {
    const tracks = Array.isArray(track) ? track : [track];
    let position = 0;

    for (const t of tracks) {
      if (options.startTime) t.position = options.startTime;
      if (options.endTime) t.endTime = options.endTime;

      if (options.atFront) {
        position = this.queue.putAtFront(t);
      } else {
        position = this.queue.put(t);
      }
    }

    return position;
  }

  public async doNext(): Promise<void> {
    if (this._current || this.isPlaying) return;

    const track = this.queue.get();
    if (!track) {
      this._state = PlayerState.IDLE;
      this.emit('queueEnd', this);
      
      if (this._autoLeave) {
        setTimeout(() => {
          if (this.queue.isEmpty && !this.isPlaying) {
            this.disconnect();
          }
        }, this._autoLeaveDelay);
      }
      return;
    }

    try {
      await this.play(track, { start: track.position });
    } catch (error) {
      logger.error(`Error playing next track in ${this.guild.name}`, error as Error, 'voicelink');
      // Try next track after delay
      setTimeout(() => this.doNext(), 5000);
    }
  }

  // Utility methods
  public isUserInChannel(user: User): boolean {
    const member = this.guild.members.cache.get(user.id);
    return member?.voice.channelId === this.channel.id;
  }

  public isPrivileged(user: User): boolean {
    const member = this.guild.members.cache.get(user.id);
    if (!member) return false;
    
    return member.permissions.has(['ManageChannels', 'ManageGuild']) || 
           member.voice.channelId === this.channel.id && this.channel.members.size <= 2;
  }

  public requiredVotes(): number {
    const memberCount = this.channel.members.filter(m => !m.user.bot).size;
    return Utils.calculateRequiredVotes(memberCount);
  }

  private clearVotes(): void {
    this.pauseVotes.clear();
    this.resumeVotes.clear();
    this.skipVotes.clear();
    this.stopVotes.clear();
    this.shuffleVotes.clear();
    this.previousVotes.clear();
  }

  // Event handlers
  public handlePlayerUpdate(message: any): void {
    this._position = message.state.position || 0;
    this._lastUpdate = Date.now();
    this._ping = message.state.ping || 0;
    
    this.emit('playerUpdate', this, message.state);
  }

  public handleEvent(message: any): void {
    switch (message.type) {
      case 'TrackStartEvent':
        this.emit('trackStart', this, this._current!);
        break;
      case 'TrackEndEvent':
        this.handleTrackEnd(message);
        break;
      case 'TrackExceptionEvent':
        this.emit('trackException', this, this._current!, message.exception);
        break;
      case 'TrackStuckEvent':
        this.emit('trackStuck', this, this._current!, message.thresholdMs);
        break;
      case 'WebSocketClosedEvent':
        logger.warn(`WebSocket closed for player in ${this.guild.name}: ${message.reason}`, 'voicelink');
        break;
    }
  }

  private handleTrackEnd(message: any): void {
    const reason = message.reason as TrackEndReason;
    const track = this._current;
    
    this._current = undefined;
    this._state = PlayerState.IDLE;
    
    if (track) {
      this.emit('trackEnd', this, track, reason);
    }

    // Auto-play next track if not manually stopped
    if (reason === TrackEndReason.FINISHED || reason === TrackEndReason.LOAD_FAILED) {
      setImmediate(() => this.doNext());
    }
  }

  // Getters
  public get current(): Track | undefined {
    return this._current;
  }

  public get volume(): number {
    return this._volume;
  }

  public get filters(): Filters {
    return this._filters;
  }

  public get isPlaying(): boolean {
    return this._state === PlayerState.PLAYING;
  }

  public get isPaused(): boolean {
    return this._paused;
  }

  public get isConnected(): boolean {
    return this._connected;
  }

  public get position(): number {
    if (!this._current || this._paused) return this._position;
    
    const timeDiff = Date.now() - this._lastUpdate;
    return this._position + timeDiff;
  }

  public get ping(): number {
    return this._ping;
  }

  public get state(): PlayerState {
    return this._state;
  }

  public get autoplay(): boolean {
    return this._autoplay;
  }

  public set autoplay(value: boolean) {
    this._autoplay = value;
  }

  public get autoLeave(): boolean {
    return this._autoLeave;
  }

  public set autoLeave(value: boolean) {
    this._autoLeave = value;
  }
}
