/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import { Filters } from '../audio/Filters';
import { Node } from '../audio/Node';
import { ILogger } from '../core/Logger';
export class AudioEffectsManager {
  private filters: Filters;
  private node: Node;
  private logger: ILogger;
  private guildId: string;
  private currentVolume = 100;
  constructor(node: Node, guildId: string, logger: ILogger) {
    this.node = node;
    this.guildId = guildId;
    this.logger = logger;
    this.filters = new Filters();
  }
  public async applyFilters(filters: Filters): Promise<void> {
    try {
      this.filters = filters;
      await this.node.send({
        op: 'filters',
        guildId: this.guildId,
        ...filters.toJSON(),
      });
      this.logger.debug('Audio filters applied successfully', 'audio');
    } catch (error) {
      this.logger.error('Failed to apply audio filters', error as Error, 'audio');
      throw error;
    }
  }
  public async setVolume(volume: number): Promise<void> {
    try {
      const clampedVolume = Math.max(0, Math.min(200, volume));
      if (clampedVolume !== volume) {
        this.logger.warn(`Volume clamped from ${volume} to ${clampedVolume}`, 'audio');
      }
      this.currentVolume = clampedVolume;
      this.filters.setVolume(clampedVolume / 100);
      await this.applyFilters(this.filters);
      this.logger.debug(`Volume set to ${clampedVolume}%`, 'audio');
    } catch (error) {
      this.logger.error('Failed to set volume', error as Error, 'audio');
      throw error;
    }
  }
  public async setEqualizer(bands: Array<{ band: number; gain: number }>): Promise<void> {
    try {
      this.filters.setEqualizer(bands);
      await this.applyFilters(this.filters);
      this.logger.debug('Equalizer bands applied', 'audio');
    } catch (error) {
      this.logger.error('Failed to set equalizer', error as Error, 'audio');
      throw error;
    }
  }
  public async setBassBoost(level: number): Promise<void> {
    try {
      const bassBoostBands = this.generateBassBoostBands(level);
      await this.setEqualizer(bassBoostBands);
      this.logger.debug(`Bass boost applied at level ${level}`, 'audio');
    } catch (error) {
      this.logger.error('Failed to apply bass boost', error as Error, 'audio');
      throw error;
    }
  }
  public async resetFilters(): Promise<void> {
    try {
      this.filters = new Filters();
      this.filters.setVolume(this.currentVolume / 100);
      await this.applyFilters(this.filters);
      this.logger.debug('Audio filters reset to default', 'audio');
    } catch (error) {
      this.logger.error('Failed to reset filters', error as Error, 'audio');
      throw error;
    }
  }
  public getFilters(): Filters {
    return this.filters;
  }
  public getVolume(): number {
    return this.currentVolume;
  }
  private generateBassBoostBands(level: number): Array<{ band: number; gain: number }> {
    const intensity = Math.max(0, Math.min(10, level)) / 10;
    const maxGain = 0.25 * intensity;
    return [
      { band: 0, gain: maxGain },
      { band: 1, gain: maxGain * 0.8 },
      { band: 2, gain: maxGain * 0.6 },
      { band: 3, gain: maxGain * 0.4 },
      { band: 4, gain: maxGain * 0.2 },
    ];
  }
}
