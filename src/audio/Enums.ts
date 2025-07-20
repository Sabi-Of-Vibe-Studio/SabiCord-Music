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
export enum LoopMode {
  NONE = 'none',
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
  CONNECTING = 'connecting',
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
export enum LoadType {
  TRACK = 'track',
  PLAYLIST = 'playlist',
  SEARCH = 'search',
  EMPTY = 'empty',
  ERROR = 'error',
}
export enum Severity {
  COMMON = 'common',
  SUSPICIOUS = 'suspicious',
  FAULT = 'fault',
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

export enum LoopType {
  NONE = 'none',
  TRACK = 'track',
  QUEUE = 'queue',
}