/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import { VoiceChannel } from 'discord.js';
import { VoiceConnection, joinVoiceChannel, VoiceConnectionStatus, entersState, DiscordGatewayAdapterCreator } from '@discordjs/voice';
import { EventEmitter } from 'events';
import { ILogger } from '../core/Logger';
export class VoiceConnectionManager extends EventEmitter {
  private connection: VoiceConnection | null = null;
  private logger: ILogger;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  constructor(logger: ILogger) {
    super();
    this.logger = logger;
  }
  public async connect(channel: VoiceChannel): Promise<void> {
    try {
      if (this.connection && this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        this.logger.warn(`Already connected to voice channel`, 'voice');
        return;
      }
      this.connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
        selfDeaf: true,
        selfMute: false,
      });
      this.setupConnectionHandlers();
      await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);
      this.logger.info(`Connected to voice channel: ${channel.name}`, 'voice');
      this.emit('connected', channel);
    } catch (error) {
      this.logger.error('Failed to connect to voice channel', error as Error, 'voice');
      throw error;
    }
  }
  public async disconnect(): Promise<void> {
    if (!this.connection) {
      return;
    }
    try {
      this.connection.destroy();
      this.connection = null;
      this.reconnectAttempts = 0;
      this.logger.info('Disconnected from voice channel', 'voice');
      this.emit('disconnected');
    } catch (error) {
      this.logger.error('Error during voice disconnection', error as Error, 'voice');
    }
  }
  public isConnected(): boolean {
    return this.connection !== null && 
           this.connection.state.status === VoiceConnectionStatus.Ready;
  }
  public getConnection(): VoiceConnection | null {
    return this.connection;
  }
  private setupConnectionHandlers(): void {
    if (!this.connection) return;
    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection!, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection!, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch (error) {
        this.handleReconnection();
      }
    });
    this.connection.on(VoiceConnectionStatus.Destroyed, () => {
      this.connection = null;
      this.emit('destroyed');
    });
    this.connection.on('error', (error) => {
      this.logger.error('Voice connection error', error, 'voice');
      this.emit('error', error);
    });
  }
  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached', undefined, 'voice');
      this.disconnect();
      return;
    }
    this.reconnectAttempts++;
    this.logger.warn(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'voice');
    try {
      if (this.connection) {
        this.connection.destroy();
      }
      this.emit('reconnecting', this.reconnectAttempts);
    } catch (error) {
      this.logger.error('Reconnection failed', error as Error, 'voice');
    }
  }
}
