/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import { Track } from './Track';
import { QueueException, QueueFull } from './Exceptions';
export interface IQueueOptions {
  maxSize?: number;
  allowDuplicate?: boolean;
}
export abstract class BaseQueue {
  protected tracks: Track[] = [];
  protected readonly maxSize: number;
  protected readonly allowDuplicate: boolean;
  constructor(options: IQueueOptions = {}) {
    this.maxSize = options.maxSize || 1000;
    this.allowDuplicate = options.allowDuplicate !== false;
  }
  public abstract add(track: Track): void;
  public abstract poll(): Track | null;
  public peek(): Track | null {
    return this.tracks[0] || null;
  }
  public remove(index: number): Track | null {
    if (index < 0 || index >= this.tracks.length) {
      return null;
    }
    const removed = this.tracks.splice(index, 1)[0];
    return removed || null;
  }
  public clear(): void {
    this.tracks = [];
  }
  public shuffle(): void {
    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = this.tracks[i];
      const other = this.tracks[j];
      if (temp && other) {
        this.tracks[i] = other;
        this.tracks[j] = temp;
      }
    }
  }
  public size(): number {
    return this.tracks.length;
  }
  public isEmpty(): boolean {
    return this.tracks.length === 0;
  }
  public isFull(): boolean {
    return this.tracks.length >= this.maxSize;
  }
  public addAt(index: number, track: Track): void {
    if (this.isFull()) {
      throw new QueueFull(`Queue is full (max: ${this.maxSize})`);
    }
    if (!this.allowDuplicate && this.hasDuplicate(track)) {
      throw new QueueException('Duplicate track not allowed');
    }
    this.tracks.splice(index, 0, track);
  }
  public moveTrack(fromIndex: number, toIndex: number): boolean {
    if (fromIndex < 0 || fromIndex >= this.tracks.length ||
        toIndex < 0 || toIndex >= this.tracks.length) {
      return false;
    }
    const track = this.tracks.splice(fromIndex, 1)[0];
    if (!track) {
      return false;
    }
    this.tracks.splice(toIndex, 0, track);
    return true;
  }
  public findTrack(predicate: (track: Track) => boolean): Track | null {
    return this.tracks.find(predicate) || null;
  }
  public filterTracks(predicate: (track: Track) => boolean): Track[] {
    return this.tracks.filter(predicate);
  }
  public getTracks(): Track[] {
    return [...this.tracks];
  }
  public getTotalDuration(): number {
    return this.tracks.reduce((total, track) => total + track.length, 0);
  }
  public get count(): number {
    return this.size();
  }
  public get formattedLength(): string {
    const totalMs = this.getTotalDuration();
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  protected hasDuplicate(track: Track): boolean {
    return this.tracks.some(t => t.identifier === track.identifier);
  }
  protected validateTrack(track: Track): void {
    if (!track) {
      throw new QueueException('Track cannot be null or undefined');
    }
  }
}
export class Queue extends BaseQueue {
  public add(track: Track): void {
    this.validateTrack(track);
    if (this.isFull()) {
      throw new QueueFull(`Queue is full (max: ${this.maxSize})`);
    }
    if (!this.allowDuplicate && this.hasDuplicate(track)) {
      throw new QueueException('Duplicate track not allowed');
    }
    this.tracks.push(track);
  }
  public poll(): Track | null {
    if (this.isEmpty()) {
      return null;
    }
    return this.tracks.shift() || null;
  }
  public skipTo(position: number): void {
    if (position < 1 || position > this.tracks.length) {
      throw new QueueException('Invalid position');
    }
    this.tracks.splice(0, position - 1);
  }
}
export class FairQueue extends BaseQueue {
  private userTrackCounts = new Map<string, number>();
  public add(track: Track): void {
    this.validateTrack(track);
    if (this.isFull()) {
      throw new QueueFull(`Queue is full (max: ${this.maxSize})`);
    }
    if (!this.allowDuplicate && this.hasDuplicate(track)) {
      throw new QueueException('Duplicate track not allowed');
    }
    const userId = track.requester.id;
    const userCount = this.userTrackCounts.get(userId) || 0;
    const insertIndex = this.calculateFairInsertPosition(userId, userCount);
    this.tracks.splice(insertIndex, 0, track);
    this.userTrackCounts.set(userId, userCount + 1);
  }
  public poll(): Track | null {
    if (this.isEmpty()) {
      return null;
    }
    const track = this.tracks.shift();
    if (track) {
      const userId = track.requester.id;
      const currentCount = this.userTrackCounts.get(userId) || 0;
      if (currentCount <= 1) {
        this.userTrackCounts.delete(userId);
      } else {
        this.userTrackCounts.set(userId, currentCount - 1);
      }
    }
    return track || null;
  }
  public override clear(): void {
    super.clear();
    this.userTrackCounts.clear();
  }
  public getUserTrackCount(userId: string): number {
    return this.userTrackCounts.get(userId) || 0;
  }
  public skipTo(position: number): void {
    if (position < 1 || position > this.tracks.length) {
      throw new QueueException('Invalid position');
    }
    const removedTracks = this.tracks.splice(0, position - 1);
    for (const track of removedTracks) {
      if (track) {
        const userId = track.requester.id;
        const currentCount = this.userTrackCounts.get(userId) || 0;
        this.userTrackCounts.set(userId, Math.max(0, currentCount - 1));
      }
    }
  }
  private calculateFairInsertPosition(_userId: string, userCount: number): number {
    if (this.tracks.length === 0) {
      return 0;
    }
    let insertIndex = this.tracks.length;
    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i];
      if (!track) continue;
      const trackUserId = track.requester.id;
      const trackUserCount = this.userTrackCounts.get(trackUserId) || 0;
      if (userCount < trackUserCount) {
        insertIndex = i;
        break;
      }
    }
    return insertIndex;
  }
}
