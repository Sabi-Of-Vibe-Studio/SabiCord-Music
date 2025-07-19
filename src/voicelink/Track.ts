/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

import { User } from 'discord.js';
import { SearchType } from './Enums';
import { Utils } from '@core/Utils';
import { container } from 'tsyringe';
import { Settings } from '@core/Settings';

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
  private _trackId?: string;
  public readonly info: ITrackInfo;
  public readonly identifier: string;
  public readonly title: string;
  public readonly author: string;
  public readonly uri: string;
  public readonly source: string;
  public readonly thumbnail?: string;
  public readonly emoji: string;
  public readonly length: number;
  public readonly requester: User;
  public readonly isStream: boolean;
  public readonly isSeekable: boolean;
  public position: number;
  public endTime?: number;
  private readonly searchType: SearchType;

  constructor(options: {
    trackId?: string;
    info: ITrackInfo;
    requester: User;
    searchType?: SearchType;
  }) {
    this._trackId = options.trackId;
    this.info = options.info;
    this.searchType = options.searchType || SearchType.YOUTUBE;

    this.identifier = options.info.identifier;
    this.title = options.info.title || 'Unknown';
    this.author = options.info.author || 'Unknown';
    this.uri = options.info.uri || 'https://discord.com/application-directory/605618911471468554';
    this.source = options.info.sourceName || this.extractDomain(this.uri);

    this.thumbnail = this.getThumbnail();
    this.emoji = this.getSourceEmoji();
    this.length = options.info.length;

    this.requester = options.requester;
    this.isStream = options.info.isStream || false;
    this.isSeekable = options.info.isSeekable !== false;
    this.position = options.info.position || 0;
  }

  get trackId(): string {
    if (!this._trackId) {
      this._trackId = this.encode(this.info);
    }
    return this._trackId;
  }

  get formattedLength(): string {
    return Utils.formatTime(this.length);
  }

  get data(): Record<string, any> {
    return {
      track_id: this.trackId,
      requester_id: this.requester.id,
      title: this.title,
      author: this.author,
      uri: this.uri,
      length: this.length,
      thumbnail: this.thumbnail,
      start_time: this.position,
      end_time: this.endTime,
    };
  }

  private getThumbnail(): string | undefined {
    if (this.info.artworkUrl) {
      return this.info.artworkUrl;
    }

    // YouTube thumbnail
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = this.uri.match(youtubeRegex);
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
    }

    return undefined;
  }

  private getSourceEmoji(): string {
    try {
      const settings = container.resolve<Settings>('Settings');
      const sourceInfo = Utils.getSourceInfo(this.source, settings.sources_settings);
      return sourceInfo.emoji;
    } catch {
      return '🎵';
    }
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  private encode(info: ITrackInfo): string {
    // Simple base64 encoding of track info
    // In a real implementation, this should match Lavalink's encoding
    const trackData = {
      identifier: info.identifier,
      title: info.title,
      author: info.author,
      uri: info.uri,
      length: info.length,
      isStream: info.isStream,
      sourceName: info.sourceName,
    };
    
    return Buffer.from(JSON.stringify(trackData)).toString('base64');
  }

  public equals(other: Track): boolean {
    return other.trackId === this.trackId;
  }

  public toString(): string {
    return this.title;
  }

  public toJSON(): Record<string, any> {
    return {
      trackId: this.trackId,
      info: this.info,
      title: this.title,
      author: this.author,
      uri: this.uri,
      source: this.source,
      thumbnail: this.thumbnail,
      length: this.length,
      formattedLength: this.formattedLength,
      requester: {
        id: this.requester.id,
        username: this.requester.username,
        displayName: this.requester.displayName,
      },
      isStream: this.isStream,
      isSeekable: this.isSeekable,
      position: this.position,
      endTime: this.endTime,
    };
  }
}

export class Playlist {
  public readonly playlistInfo: IPlaylistInfo;
  public readonly name: string;
  public readonly thumbnail?: string;
  public readonly uri?: string;
  public readonly tracks: Track[];
  public selectedTrack?: number;

  constructor(options: {
    playlistInfo: IPlaylistInfo;
    tracks: Array<{ encoded: string; info: ITrackInfo }>;
    requester: User;
    searchType?: SearchType;
  }) {
    this.playlistInfo = options.playlistInfo;
    this.name = options.playlistInfo.name;
    this.selectedTrack = options.playlistInfo.selectedTrack;

    this.tracks = options.tracks.map(
      track =>
        new Track({
          trackId: track.encoded,
          info: track.info,
          requester: options.requester,
          searchType: options.searchType,
        })
    );
  }

  public toString(): string {
    return this.name;
  }

  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      thumbnail: this.thumbnail,
      uri: this.uri,
      trackCount: this.tracks.length,
      selectedTrack: this.selectedTrack,
      tracks: this.tracks.map(track => track.toJSON()),
    };
  }
}
