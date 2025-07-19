/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

import { User } from 'discord.js';
import { Track } from './Track';
import { LoopType, LoopTypeCycle } from './Enums';
import { QueueFull, OutOfList } from './Exceptions';

export interface IQueueOptions {
  maxSize: number;
  allowDuplicate: boolean;
}

export class Queue {
  private _queue: Track[] = [];
  private _position = 0;
  private _size: number;
  private _repeat: LoopTypeCycle = new LoopTypeCycle();
  private _repeatPosition = 0;
  private _allowDuplicate: boolean;

  constructor(options: IQueueOptions) {
    this._size = options.maxSize;
    this._allowDuplicate = options.allowDuplicate;
  }

  public get(): Track | null {
    let track: Track | null = null;

    try {
      const index = this._repeat.mode === LoopType.TRACK ? this._position - 1 : this._position;
      track = this._queue[index] || null;
      
      if (this._repeat.mode !== LoopType.TRACK) {
        this._position += 1;
      }
    } catch {
      if (this._repeat.mode === LoopType.QUEUE) {
        try {
          track = this._queue[this._repeatPosition] || null;
          this._position = this._repeatPosition + 1;
        } catch {
          this._repeat.setMode(LoopType.OFF);
        }
      }
    }

    return track;
  }

  public put(item: Track): number {
    if (this.count >= this._size) {
      throw new QueueFull(`Queue is full! Maximum size: ${this._size}`);
    }

    if (!this._allowDuplicate && this.hasDuplicate(item)) {
      return this.count;
    }

    this._queue.push(item);
    return this.count;
  }

  public putAtFront(item: Track): number {
    if (this.count >= this._size) {
      throw new QueueFull(`Queue is full! Maximum size: ${this._size}`);
    }

    if (!this._allowDuplicate && this.hasDuplicate(item)) {
      return 1;
    }

    this._queue.splice(this._position, 0, item);
    return 1;
  }

  public putAtIndex(index: number, item: Track): void {
    if (this.count >= this._size) {
      throw new QueueFull(`Queue is full! Maximum size: ${this._size}`);
    }

    if (!this._allowDuplicate && this.hasDuplicate(item)) {
      return;
    }

    const insertIndex = this._position - 1 + index;
    this._queue.splice(insertIndex, 0, item);
  }

  public skipTo(index: number): void {
    if (index < 1 || index > this.count) {
      throw new OutOfList('Index out of queue range');
    }
    this._position += index - 1;
  }

  public remove(index: number, index2?: number, member?: User): Record<number, Track> {
    const pos = this._position - 1;
    const startIndex = index;
    const endIndex = index2 ?? index;

    if (startIndex < 1 || endIndex > this.count || startIndex > endIndex) {
      throw new OutOfList('Invalid index range');
    }

    const removedTracks: Record<number, Track> = {};
    const tracksToRemove: Track[] = [];

    for (let i = startIndex; i <= endIndex; i++) {
      const trackIndex = pos + i;
      const track = this._queue[trackIndex];
      
      if (track && (!member || track.requester.id === member.id)) {
        tracksToRemove.push(track);
        removedTracks[i] = track;
      }
    }

    // Remove tracks from queue
    tracksToRemove.forEach(track => {
      const trackIndex = this._queue.indexOf(track);
      if (trackIndex !== -1) {
        this._queue.splice(trackIndex, 1);
      }
    });

    return removedTracks;
  }

  public clear(): void {
    this._queue = [];
    this._position = 0;
    this._repeatPosition = 0;
  }

  public shuffle(): void {
    const currentTracks = this.tracks();
    
    // Fisher-Yates shuffle
    for (let i = currentTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [currentTracks[i], currentTracks[j]] = [currentTracks[j], currentTracks[i]];
    }

    // Replace the queue portion that hasn't been played
    this._queue.splice(this._position, this._queue.length - this._position, ...currentTracks);
  }

  public history(includeCurrentTrack = false): Track[] {
    const endIndex = includeCurrentTrack ? this._position : this._position - 1;
    return this._queue.slice(0, Math.max(0, endIndex));
  }

  public tracks(includeCurrentTrack = false): Track[] {
    const startIndex = includeCurrentTrack ? this._position - 1 : this._position;
    return this._queue.slice(Math.max(0, startIndex));
  }

  public setRepeat(mode: LoopType): void {
    if (mode === LoopType.QUEUE) {
      this._repeatPosition = this._position - 1;
    }
    this._repeat.setMode(mode);
  }

  public nextRepeat(): LoopType {
    return this._repeat.next();
  }

  private hasDuplicate(item: Track): boolean {
    return this._queue.some(track => track.equals(item));
  }

  // Getters
  public get count(): number {
    return this._queue.length;
  }

  public get size(): number {
    return this._size;
  }

  public get position(): number {
    return this._position;
  }

  public get repeatMode(): LoopType {
    return this._repeat.mode;
  }

  public get repeatModeString(): string {
    return this._repeat.toString();
  }

  public get isEmpty(): boolean {
    return this.tracks().length === 0;
  }

  public get length(): number {
    return this.tracks().reduce((total, track) => total + track.length, 0);
  }

  public get formattedLength(): string {
    const totalMs = this.length;
    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  public toJSON(): Record<string, any> {
    return {
      tracks: this.tracks().map(track => track.toJSON()),
      history: this.history().map(track => track.toJSON()),
      count: this.count,
      position: this._position,
      repeatMode: this.repeatMode,
      length: this.length,
      formattedLength: this.formattedLength,
    };
  }
}

export class FairQueue extends Queue {
  private _userSet = new Set<string>();

  public put(item: Track): number {
    if (this.count >= this.size) {
      throw new QueueFull(`Queue is full! Maximum size: ${this.size}`);
    }

    const tracks = this.tracks(true);
    let lastIndex = tracks.length;

    // Find the last track by the same requester
    for (let i = tracks.length - 1; i >= 0; i--) {
      if (tracks[i].requester.id === item.requester.id) {
        break;
      }
      lastIndex--;
    }

    // Find fair position
    this._userSet.clear();
    for (let i = lastIndex; i < tracks.length; i++) {
      if (this._userSet.has(tracks[i].requester.id)) {
        break;
      }
      lastIndex++;
      this._userSet.add(tracks[i].requester.id);
    }

    this.putAtIndex(lastIndex, item);
    return lastIndex;
  }
}
