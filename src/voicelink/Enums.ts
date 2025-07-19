/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

export enum SearchType {
  YOUTUBE = 'ytsearch',
  YOUTUBE_MUSIC = 'ytmsearch',
  SOUNDCLOUD = 'scsearch',
  SPOTIFY = 'spsearch',
  APPLE_MUSIC = 'amsearch',
  DEEZER = 'dzsearch',
  BANDCAMP = 'bcsearch',
  TWITCH = 'twitchsearch',
  VIMEO = 'vmsearch',
  REDDIT = 'rdsearch',
  TIKTOK = 'ttsearch',
}

export enum LoopType {
  OFF = 'off',
  TRACK = 'track',
  QUEUE = 'queue',
}

export enum RequestMethod {
  GET = 'GET',
  POST = 'POST',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export enum NodeAlgorithm {
  BY_PING = 'ping',
  BY_REGION = 'region',
  BY_PLAYERS = 'players',
}

export enum PlayerState {
  IDLE = 'idle',
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  DESTROYED = 'destroyed',
}

export enum TrackEndReason {
  FINISHED = 'finished',
  LOAD_FAILED = 'loadFailed',
  STOPPED = 'stopped',
  REPLACED = 'replaced',
  CLEANUP = 'cleanup',
}

export enum FilterType {
  VOLUME = 'volume',
  EQUALIZER = 'equalizer',
  KARAOKE = 'karaoke',
  TIMESCALE = 'timescale',
  TREMOLO = 'tremolo',
  VIBRATO = 'vibrato',
  ROTATION = 'rotation',
  DISTORTION = 'distortion',
  CHANNEL_MIX = 'channelMix',
  LOW_PASS = 'lowPass',
}

export class LoopTypeCycle {
  private _mode: LoopType = LoopType.OFF;

  get mode(): LoopType {
    return this._mode;
  }

  setMode(mode: LoopType): void {
    this._mode = mode;
  }

  next(): LoopType {
    switch (this._mode) {
      case LoopType.OFF:
        this._mode = LoopType.TRACK;
        break;
      case LoopType.TRACK:
        this._mode = LoopType.QUEUE;
        break;
      case LoopType.QUEUE:
        this._mode = LoopType.OFF;
        break;
    }
    return this._mode;
  }

  toString(): string {
    switch (this._mode) {
      case LoopType.OFF:
        return 'Off';
      case LoopType.TRACK:
        return 'Track';
      case LoopType.QUEUE:
        return 'Queue';
      default:
        return 'Off';
    }
  }
}
