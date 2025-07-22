/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import { Track } from '../audio/Track';
import { Queue, FairQueue } from '../audio/Queue';
import { LoopType } from '../audio/Enums';
import { ILogger } from '../core/Logger';
export class QueueManager {
  private queue: Queue | FairQueue;
  private logger: ILogger;
  private loopMode: LoopType = LoopType.NONE;
  private previousTrack: Track | null = null;
  constructor(queueType: 'Queue' | 'FairQueue', maxSize: number, logger: ILogger) {
    this.queue = queueType === 'FairQueue' ? new FairQueue({maxSize}) : new Queue({maxSize});
    this.logger = logger;
  }
  public addTrack(track: Track): void {
    try {
      this.queue.add(track);
      this.logger.debug(`Track added to queue: ${track.title}`, 'queue');
    } catch (error) {
      this.logger.error('Failed to add track to queue', error as Error, 'queue');
      throw error;
    }
  }
  public addTracks(tracks: Track[]): void {
    try {
      for (const track of tracks) {
        this.queue.add(track);
      }
      this.logger.debug(`${tracks.length} tracks added to queue`, 'queue');
    } catch (error) {
      this.logger.error('Failed to add tracks to queue', error as Error, 'queue');
      throw error;
    }
  }
  public removeTrack(index: number): Track | null {
    try {
      const track = this.queue.remove(index);
      if (track) {
        this.logger.debug(`Track removed from queue: ${track.title}`, 'queue');
      }
      return track;
    } catch (error) {
      this.logger.error('Failed to remove track from queue', error as Error, 'queue');
      return null;
    }
  }
  public getNext(): Track | null {
    try {
      let nextTrack: Track | null = null;
      switch (this.loopMode) {
        case LoopType.TRACK:
          nextTrack = this.previousTrack;
          break;
        case LoopType.QUEUE:
          nextTrack = this.queue.poll();
          if (nextTrack && this.previousTrack) {
            this.queue.add(this.previousTrack);
          }
          break;
        case LoopType.NONE:
        default:
          nextTrack = this.queue.poll();
          break;
      }
      if (nextTrack) {
        this.previousTrack = nextTrack;
        this.logger.debug(`Next track: ${nextTrack.title}`, 'queue');
      }
      return nextTrack;
    } catch (error) {
      this.logger.error('Failed to get next track', error as Error, 'queue');
      return null;
    }
  }
  public clear(): void {
    try {
      this.queue.clear();
      this.previousTrack = null;
      this.logger.debug('Queue cleared', 'queue');
    } catch (error) {
      this.logger.error('Failed to clear queue', error as Error, 'queue');
    }
  }
  public shuffle(): void {
    try {
      this.queue.shuffle();
      this.logger.debug('Queue shuffled', 'queue');
    } catch (error) {
      this.logger.error('Failed to shuffle queue', error as Error, 'queue');
    }
  }
  public size(): number {
    return this.queue.size();
  }
  public isEmpty(): boolean {
    return this.queue.isEmpty();
  }
  public getTracks(): Track[] {
    return this.queue.getTracks();
  }
  public setLoopMode(mode: LoopType): void {
    this.loopMode = mode;
    this.logger.debug(`Loop mode set to: ${mode}`, 'queue');
  }
  public getLoopMode(): LoopType {
    return this.loopMode;
  }
  public getCurrentTrack(): Track | null {
    return this.previousTrack;
  }
  public peekNext(): Track | null {
    return this.queue.peek();
  }
  public getTrackPosition(track: Track): number {
    const tracks = this.queue.getTracks();
    return tracks.findIndex(t => t.identifier === track.identifier);
  }
  public moveTrack(fromIndex: number, toIndex: number): boolean {
    try {
      const track = this.removeTrack(fromIndex);
      if (track) {
        this.queue.addAt(toIndex, track);
        this.logger.debug(`Track moved from ${fromIndex} to ${toIndex}`, 'queue');
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Failed to move track', error as Error, 'queue');
      return false;
    }
  }
}
