/**
 * MIT License
 *
 * Copyright (c) 2025 NirrussVn0
 */
import { VoiceChannel, Guild, User } from 'discord.js';

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
export interface ITrack {
  track_id: string;
  title: string;
  author: string;
  uri: string;
  length: number;
  thumbnail?: string;
  requester?: User;
  start_time?: number;
  end_time?: number;
  is_stream: boolean;
  formatted_length: string;
  source: string;
}
export interface IPlaylist {
  name: string;
  tracks: ITrack[];
  selected_track?: number;
}
export interface IQueue {
  tracks: ITrack[];
  current_index: number;
  repeat_mode: LoopType;
  shuffle: boolean;
  add(track: ITrack | ITrack[], at_front?: boolean): Promise<number>;
  remove(index: number): Promise<ITrack | null>;
  clear(): Promise<void>;
  shuffle_queue(): Promise<void>;
  get_next(): Promise<ITrack | null>;
  get_previous(): Promise<ITrack | null>;
}
export interface IFilter {
  name: string;
  value: any;
}
export interface IFilters {
  volume?: number;
  equalizer?: number[];
  karaoke?: any;
  timescale?: any;
  tremolo?: any;
  vibrato?: any;
  rotation?: any;
  distortion?: any;
  channel_mix?: any;
  low_pass?: any;
}
export interface INode {
  identifier: string;
  host: string;
  port: number;
  password: string;
  secure: boolean;
  connected: boolean;
  player_count: number;
  ping: number;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(data: any): Promise<any>;
}
export interface IPlayer {
  guild: Guild;
  channel: VoiceChannel;
  node: INode;
  queue: IQueue;
  current: ITrack | null;
  volume: number;
  is_playing: boolean;
  is_paused: boolean;
  is_connected: boolean;
  position: number;
  ping: number;
  pause_votes: Set<User>;
  resume_votes: Set<User>;
  skip_votes: Set<User>;
  stop_votes: Set<User>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  play(track: ITrack, options?: { start?: number; end?: number }): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(position: number): Promise<void>;
  set_volume(volume: number): Promise<void>;
  set_filters(filters: IFilters): Promise<void>;
  set_repeat(mode: LoopType): Promise<void>;
  is_user_join(user: User): boolean;
  is_privileged(user: User): boolean;
  required(): number;
  get_tracks(query: string, options?: { requester?: User; search_type?: SearchType }): Promise<ITrack[] | IPlaylist | null>;
  add_track(track: ITrack | ITrack[], options?: { at_front?: boolean; start_time?: number; end_time?: number }): Promise<number>;
  do_next(): Promise<void>;
}
export interface IPlayerEvents {
  trackStart: (player: IPlayer, track: ITrack) => void;
  trackEnd: (player: IPlayer, track: ITrack, reason: string) => void;
  trackException: (player: IPlayer, track: ITrack, exception: any) => void;
  trackStuck: (player: IPlayer, track: ITrack, threshold: number) => void;
  playerUpdate: (player: IPlayer, state: any) => void;
  playerDestroy: (player: IPlayer) => void;
}
