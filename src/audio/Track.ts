/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import { User } from 'discord.js';
import { SearchType } from './Enums';
import { Utils } from '../core/Utils';

export interface ITrackInfo {
  identifier: string;
  title: string;
  author: string;
  uri: string;
  sourceName: string;
  artworkUrl?: string;
  length: number;
  isStream: boolean;
  isSeekable: boolean;
  position?: number;
}
export interface IPlaylistInfo {
  name: string;
  selectedTrack?: number;
}
export class Track {
  private readonly trackId?: string | undefined;
  public readonly info: ITrackInfo;
  public readonly identifier: string;
  public readonly title: string;
  public readonly author: string;
  public readonly uri: string;
  public readonly source: string;
  public readonly thumbnail?: string | undefined;
  public readonly emoji: string;
  public readonly length: number;
  public readonly requester: User;
  public readonly isStream: boolean;
  public readonly isSeekable: boolean;
  public position: number;
  public endTime?: number;
  private readonly searchType: SearchType;
  constructor(options: {
    trackId?: string | undefined;
    info: ITrackInfo;
    requester: User;
    searchType?: SearchType | undefined;
  }) {
    this.trackId = options.trackId;
    this.info = options.info;
    this.identifier = options.info.identifier;
    this.title = options.info.title;
    this.author = options.info.author;
    this.uri = options.info.uri;
    this.source = options.info.sourceName;
    this.thumbnail = options.info.artworkUrl;
    this.length = options.info.length;
    this.requester = options.requester;
    this.isStream = options.info.isStream;
    this.isSeekable = options.info.isSeekable;
    this.position = options.info.position || 0;
    this.searchType = options.searchType || SearchType.YOUTUBE;
    this.emoji = this.getSourceEmoji();
  }
  public get track(): string {
    return this.trackId || '';
  }
  public get data(): any {
    return {
      identifier: this.identifier,
      title: this.title,
      author: this.author,
      uri: this.uri,
      source: this.source,
      thumbnail: this.thumbnail,
      length: this.length,
      isStream: this.isStream,
      position: this.position,
      requester: {
        id: this.requester.id,
        username: this.requester.username,
        discriminator: this.requester.discriminator,
        avatar: this.requester.avatar,
      },
    };
  }
  public get duration(): string {
    return this.isStream ? 'LIVE' : Utils.formatTime(this.length);
  }
  public get formattedLength(): string {
    return this.duration;
  }
  public get formattedDuration(): string {
    if (this.isStream) return 'LIVE';
    const hours = Math.floor(this.length / 3600000);
    const minutes = Math.floor((this.length % 3600000) / 60000);
    const seconds = Math.floor((this.length % 60000) / 1000);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  public get displayTitle(): string {
    const maxLength = 50;
    return this.title.length > maxLength 
      ? `${this.title.substring(0, maxLength)}...` 
      : this.title;
  }
  public get displayAuthor(): string {
    const maxLength = 30;
    return this.author.length > maxLength 
      ? `${this.author.substring(0, maxLength)}...` 
      : this.author;
  }
  public setStartTime(time: number): void {
    this.position = Math.max(0, time);
  }
  public setEndTime(time: number): void {
    this.endTime = Math.max(this.position, time);
  }
  public clone(): Track {
    return new Track({
      trackId: this.trackId,
      info: { ...this.info },
      requester: this.requester,
      searchType: this.searchType,
    });
  }
  private getSourceEmoji(): string {
    const emojiMap: Record<string, string> = {
      youtube: '🎵',
      youtubemusic: '🎵',
      spotify: '🎵',
      soundcloud: '🎵',
      twitch: '🎵',
      bandcamp: '🎵',
      vimeo: '🎵',
      applemusic: '🎵',
      deezer: '🎵',
      reddit: '🎵',
      tiktok: '🎵',
    };
    return emojiMap[this.source.toLowerCase()] || '🔗';
  }
}
export class Playlist {
  public readonly name: string;
  public readonly tracks: Track[];
  public readonly selectedTrack: number;
  public readonly requester: User;
  public readonly source: string;
  public readonly uri?: string | undefined;
  public readonly thumbnail?: string | undefined;
  constructor(options: {
    name: string;
    tracks: Track[];
    selectedTrack?: number | undefined;
    requester: User;
    source: string;
    uri?: string | undefined;
    thumbnail?: string | undefined;
  }) {
    this.name = options.name;
    this.tracks = options.tracks;
    this.selectedTrack = options.selectedTrack || 0;
    this.requester = options.requester;
    this.source = options.source;
    this.uri = options.uri;
    this.thumbnail = options.thumbnail;
  }
  public get duration(): number {
    return this.tracks.reduce((total, track) => total + track.length, 0);
  }
  public get formattedDuration(): string {
    return Utils.formatTime(this.duration);
  }
  public get size(): number {
    return this.tracks.length;
  }
  public getTrack(index: number): Track | null {
    return this.tracks[index] || null;
  }
  public getSelectedTrack(): Track | null {
    return this.getTrack(this.selectedTrack);
  }
  public slice(start: number, end?: number): Track[] {
    return this.tracks.slice(start, end);
  }
}
