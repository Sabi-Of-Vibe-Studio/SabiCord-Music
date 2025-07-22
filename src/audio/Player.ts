/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import {
  VoiceChannel,
  Guild,
  User,
  PermissionsBitField
} from 'discord.js';
import {
  VoiceConnection,
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
  DiscordGatewayAdapterCreator
} from '@discordjs/voice';
import { EventEmitter } from 'events';
import { Track } from './Track';
import { Queue, FairQueue } from './Queue';
import { Filters } from './Filters';
import { Node, NodePool } from './Node';
import { LoopMode, RequestMethod, PlayerState, TrackEndReason } from './Enums';
import { 
  PlayerNotConnected, 
  PlayerAlreadyConnected, 
  InvalidChannelPermissions,
  AudioException 
} from './Exceptions';
import { ILogger } from '../core/Logger';
import { container } from 'tsyringe';
import { Database } from '../core/Database';
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
  voiceConnectionUpdate: [player: Player, state: any];
}
export class Player extends EventEmitter {
  private readonly logger: ILogger;
  private connection?: VoiceConnection;
  private currentTrack: Track | undefined;
  private filters: Filters;
  private state: PlayerState = PlayerState.IDLE;
  private volume = 100;
  private paused = false;
  private connected = false;
  private loop: LoopMode = LoopMode.NONE;
  private trackPosition = 0;
  private joinTime: number;
  public readonly pauseVotes = new Set<User>();
  public readonly resumeVotes = new Set<User>();
  public readonly stopVotes = new Set<User>();
  public readonly shuffleVotes = new Set<User>();
  public readonly skipVotes = new Set<User>();
  public readonly guild: Guild;
  public readonly channel: VoiceChannel;
  public readonly node: Node;
  public readonly queue: Queue | FairQueue;
  constructor(options: IPlayerOptions) {
    super();
    this.guild = options.guild;
    this.channel = options.channel;
    this.node = options.node || NodePool.getNode();
    this.joinTime = Date.now();
    this.volume = options.volume || 100;
    const QueueClass = options.queueType === 'FairQueue' ? FairQueue : Queue;
    this.queue = new QueueClass({
      maxSize: options.maxQueueSize || 1000,
      allowDuplicate: options.allowDuplicate !== false,
    });
    this.filters = new Filters();
    this.logger = container.resolve<ILogger>('Logger');
    this.node.addPlayer(this);
    this.setupEventHandlers();
    this.logger.debug(`Player created for guild ${this.guild.name} (${this.guild.id})`, 'audio');
  }
  public get playing(): boolean {
    return this.state === PlayerState.PLAYING;
  }
  public get isPaused(): boolean {
    return this.paused;
  }
  public get isConnected(): boolean {
    return this.connected;
  }
  public get currentVolume(): number {
    return this.volume;
  }
  public get loopMode(): LoopMode {
    return this.loop;
  }
  public get position(): number {
    return this.trackPosition;
  }
  public get playerState(): PlayerState {
    return this.state;
  }
  public get current(): Track | undefined {
    return this.currentTrack;
  }
  public get uptime(): number {
    return Date.now() - this.joinTime;
  }
  public async connect(): Promise<void> {
    if (this.connected) {
      throw new PlayerAlreadyConnected('Player is already connected');
    }
    this.validateChannelPermissions();
    try {
      this.connection = joinVoiceChannel({
        channelId: this.channel.id,
        guildId: this.guild.id,
        adapterCreator: this.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
        selfDeaf: true,
        selfMute: false,
      });
      await entersState(this.connection, VoiceConnectionStatus.Ready, 30000);
      this.connected = true;
      this.state = PlayerState.IDLE;
      await this.sendPlayerUpdate();
      await this.setVolume(this.volume);
      this.setupVoiceConnectionHandlers();
      this.logger.info(`Player connected to ${this.channel.name} in ${this.guild.name}`, 'audio');
      this.emit('voiceConnectionUpdate', this, 'connected');
    } catch (error) {
      this.logger.error(`Failed to connect player in ${this.guild.name}`, error as Error, 'audio');
      throw new AudioException(`Failed to connect to voice channel: ${error}`);
    }
  }
  public async disconnect(): Promise<void> {
    if (!this.connected) return;
    try {
      this.connection?.destroy();
      this.connected = false;
      this.state = PlayerState.IDLE;
      this.currentTrack = undefined;
      this.logger.info(`Player disconnected from ${this.guild.name}`, 'audio');
      this.emit('voiceConnectionUpdate', this, 'disconnected');
    } catch (error) {
      this.logger.error(`Error disconnecting player from ${this.guild.name}`, error as Error, 'audio');
    }
  }
  public async play(track?: Track, options: { noReplace?: boolean } = {}): Promise<void> {
    if (!this.connected) {
      throw new PlayerNotConnected('Player is not connected to a voice channel');
    }
    const trackToPlay = track || this.queue.poll();
    if (!trackToPlay) {
      this.emit('queueEnd', this);
      return;
    }
    const data: any = {
      track: {
        encoded: trackToPlay.track,
      },
      volume: this.volume,
      position: trackToPlay.position,
    };
    if (trackToPlay.endTime) {
      data.endTime = trackToPlay.endTime;
    }
    const query = options.noReplace ? 'noReplace=true' : '';
    await this.node.send(RequestMethod.PATCH, `sessions/${this.node.identifier}/players/${this.guild.id}`, data, query);
    this.currentTrack = trackToPlay;
    this.state = PlayerState.PLAYING;
    this.paused = false;
    this.clearVotes();
    await this.addToUserHistory(trackToPlay);
    this.logger.debug(`Playing ${trackToPlay.title} in ${this.guild.name}`, 'audio');
    this.emit('trackStart', this, trackToPlay);
  }
  public async pause(): Promise<void> {
    if (!this.playing) {
      throw new AudioException('Player is not currently playing');
    }
    await this.node.send(RequestMethod.PATCH, `sessions/${this.node.identifier}/players/${this.guild.id}`, {
      paused: true,
    });
    this.paused = true;
    this.state = PlayerState.PAUSED;
    this.logger.debug(`Player paused in ${this.guild.name}`, 'audio');
  }
  public async resume(): Promise<void> {
    if (!this.paused) {
      throw new AudioException('Player is not paused');
    }
    await this.node.send(RequestMethod.PATCH, `sessions/${this.node.identifier}/players/${this.guild.id}`, {
      paused: false,
    });
    this.paused = false;
    this.state = PlayerState.PLAYING;
    this.logger.debug(`Player resumed in ${this.guild.name}`, 'audio');
  }
  public async stop(): Promise<void> {
    if (!this.playing && !this.paused) {
      throw new AudioException('Player is not currently playing or paused');
    }
    await this.node.send(RequestMethod.PATCH, `sessions/${this.node.identifier}/players/${this.guild.id}`, {
      track: null,
    });
    this.currentTrack = undefined;
    this.state = PlayerState.STOPPED;
    this.paused = false;
    this.logger.debug(`Player stopped in ${this.guild.name}`, 'audio');
  }
  public async skip(): Promise<void> {
    if (!this.currentTrack) {
      throw new AudioException('No track is currently playing');
    }
    const nextTrack = this.getNextTrack();
    if (nextTrack) {
      await this.play(nextTrack);
    } else {
      await this.stop();
      this.emit('queueEnd', this);
    }
  }
  public async seek(position: number): Promise<void> {
    if (!this.currentTrack) {
      throw new AudioException('No track is currently playing');
    }
    if (!this.currentTrack.isSeekable) {
      throw new AudioException('Current track is not seekable');
    }
    await this.node.send(RequestMethod.PATCH, `sessions/${this.node.identifier}/players/${this.guild.id}`, {
      position,
    });
    this.logger.debug(`Seeked to ${position}ms in ${this.guild.name}`, 'audio');
  }
  public async setVolume(volume: number): Promise<void> {
    const clampedVolume = Math.max(0, Math.min(200, volume));
    this.filters.setVolume(clampedVolume / 100);
    await this.applyFilters();
    this.volume = clampedVolume;
    this.logger.debug(`Volume set to ${clampedVolume}% in ${this.guild.name}`, 'audio');
  }
  public setLoop(mode: LoopMode): void {
    this.loop = mode;
    this.logger.debug(`Loop mode set to ${mode} in ${this.guild.name}`, 'audio');
  }
  public async applyFilters(): Promise<void> {
    await this.node.send(RequestMethod.PATCH, `sessions/${this.node.identifier}/players/${this.guild.id}`, {
      filters: this.filters.toJSON(),
    });
    this.logger.debug(`Filters applied in ${this.guild.name}`, 'audio');
  }
  public async setFilters(filters: Filters): Promise<void> {
    this.filters = filters;
    await this.applyFilters();
  }
  public addSkipVote(user: User): boolean {
    this.skipVotes.add(user);
    return this.skipVotes.size >= this.getRequiredVotes();
  }
  public removeSkipVote(user: User): void {
    this.skipVotes.delete(user);
  }
  public clearVotes(): void {
    this.skipVotes.clear();
    this.pauseVotes.clear();
    this.resumeVotes.clear();
    this.stopVotes.clear();
    this.shuffleVotes.clear();
  }
  public getSkipVotes(): number {
    return this.skipVotes.size;
  }
  public getRequiredVotes(): number {
    const voiceMembers = this.channel.members.filter((m: any) => !m.user.bot).size;
    return Math.ceil(voiceMembers / 2);
  }
  public requiredVotes(): number {
    return this.getRequiredVotes();
  }
  public isPrivileged(user: User): boolean {
    const member = this.guild.members.cache.get(user.id);
    if (!member) return false;
    return member.permissions.has([PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.Administrator]) ||
           member.id === this.guild.ownerId ||
           this.channel.members.size <= 2;
  }
  public isUserInChannel(user: User): boolean {
    return this.channel.members.has(user.id);
  }
  public async destroy(): Promise<void> {
    try {
      await this.stop();
      await this.disconnect();
      this.node.removePlayer(this.guild.id);
      this.state = PlayerState.DESTROYED;
      this.removeAllListeners();
      this.logger.info(`Player destroyed for ${this.guild.name}`, 'audio');
      this.emit('playerDestroy', this);
    } catch (error) {
      this.logger.error(`Error destroying player for ${this.guild.name}`, error as Error, 'audio');
    }
  }
  private getNextTrack(): Track | null {
    switch (this.loop) {
      case LoopMode.TRACK:
        return this.currentTrack || null;
      case LoopMode.QUEUE:
        if (this.currentTrack) {
          this.queue.add(this.currentTrack);
        }
        return this.queue.poll();
      case LoopMode.NONE:
      default:
        return this.queue.poll();
    }
  }
  private validateChannelPermissions(): void {
    const permissions = this.channel.permissionsFor(this.guild.members.me!);
    if (!permissions?.has([PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak])) {
      throw new InvalidChannelPermissions('Missing required voice channel permissions');
    }
  }
  private setupEventHandlers(): void {
    this.node.on('event', (message) => {
      if (message.guildId !== this.guild.id) return;
      switch (message.type) {
        case 'TrackStartEvent':
          this.handleTrackStart(message);
          break;
        case 'TrackEndEvent':
          this.handleTrackEnd(message);
          break;
        case 'TrackExceptionEvent':
          this.handleTrackException(message);
          break;
        case 'TrackStuckEvent':
          this.handleTrackStuck(message);
          break;
        case 'WebSocketClosedEvent':
          this.handleWebSocketClosed(message);
          break;
      }
    });
    this.node.on('playerUpdate', (state) => {
      this.emit('playerUpdate', this, state);
    });
  }
  private setupVoiceConnectionHandlers(): void {
    if (!this.connection) return;
    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection!, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection!, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        this.connection?.destroy();
      }
    });
    this.connection.on(VoiceConnectionStatus.Destroyed, () => {
      this.connected = false;
      this.state = PlayerState.IDLE;
    });
  }
  private async sendPlayerUpdate(): Promise<void> {
    const joinConfig = this.connection?.joinConfig as any;
    await this.node.send(RequestMethod.PATCH, `sessions/${this.node.identifier}/players/${this.guild.id}`, {
      voice: {
        token: joinConfig?.token,
        endpoint: joinConfig?.endpoint,
        sessionId: joinConfig?.sessionId,
      },
    });
  }
  private async addToUserHistory(track: Track): Promise<void> {
    if (track.requester.bot) return;
    try {
      const database = container.resolve<Database>('Database');
      await database.users.addToHistory(track.requester.id, track.data, this.guild.id);
    } catch (error) {
      this.logger.error('Failed to add track to user history', error as Error, 'audio');
    }
  }
  private handleTrackStart(_message: any): void {
    if (this.currentTrack) {
      this.emit('trackStart', this, this.currentTrack);
    }
  }
  private handleTrackEnd(message: any): void {
    if (this.currentTrack) {
      this.emit('trackEnd', this, this.currentTrack, message.reason);
      if (message.reason !== TrackEndReason.REPLACED) {
        this.handleAutoPlay();
      }
    }
  }
  private handleTrackException(message: any): void {
    if (this.currentTrack) {
      this.emit('trackException', this, this.currentTrack, message.exception);
    }
  }
  private handleTrackStuck(message: any): void {
    if (this.currentTrack) {
      this.emit('trackStuck', this, this.currentTrack, message.thresholdMs);
    }
  }
  private handleWebSocketClosed(message: any): void {
    this.logger.warn(`WebSocket closed for player in ${this.guild.name}: ${message.code} ${message.reason}`, 'audio');
  }
  private async handleAutoPlay(): Promise<void> {
    const nextTrack = this.getNextTrack();
    if (nextTrack) {
      await this.play(nextTrack);
    } else {
      this.state = PlayerState.IDLE;
      this.currentTrack = undefined;
      this.emit('queueEnd', this);
    }
  }
}
