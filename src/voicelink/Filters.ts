/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

import { FilterType } from './Enums';
import { FilterInvalidArgument, FilterTagAlreadyInUse } from './Exceptions';

export interface IEqualizerBand {
  band: number;
  gain: number;
}

export interface IKaraokeFilter {
  level?: number;
  monoLevel?: number;
  filterBand?: number;
  filterWidth?: number;
}

export interface ITimescaleFilter {
  speed?: number;
  pitch?: number;
  rate?: number;
}

export interface ITremoloFilter {
  frequency?: number;
  depth?: number;
}

export interface IVibratoFilter {
  frequency?: number;
  depth?: number;
}

export interface IRotationFilter {
  rotationHz?: number;
}

export interface IDistortionFilter {
  sinOffset?: number;
  sinScale?: number;
  cosOffset?: number;
  cosScale?: number;
  tanOffset?: number;
  tanScale?: number;
  offset?: number;
  scale?: number;
}

export interface IChannelMixFilter {
  leftToLeft?: number;
  leftToRight?: number;
  rightToLeft?: number;
  rightToRight?: number;
}

export interface ILowPassFilter {
  smoothing?: number;
}

export class Filter {
  public readonly name: string;
  public readonly type: FilterType;
  public readonly value: any;

  constructor(name: string, type: FilterType, value: any) {
    this.name = name;
    this.type = type;
    this.value = value;
  }

  public toJSON(): Record<string, any> {
    return {
      [this.type]: this.value,
    };
  }
}

export class Filters {
  private _filters = new Map<string, Filter>();

  public add(filter: Filter): void {
    if (this._filters.has(filter.name)) {
      throw new FilterTagAlreadyInUse(`Filter with name '${filter.name}' already exists`);
    }
    this._filters.set(filter.name, filter);
  }

  public remove(name: string): boolean {
    return this._filters.delete(name);
  }

  public get(name: string): Filter | undefined {
    return this._filters.get(name);
  }

  public has(name: string): boolean {
    return this._filters.has(name);
  }

  public clear(): void {
    this._filters.clear();
  }

  public setVolume(volume: number): void {
    if (volume < 0 || volume > 1000) {
      throw new FilterInvalidArgument('Volume must be between 0 and 1000');
    }
    
    const filter = new Filter('volume', FilterType.VOLUME, volume / 100);
    this._filters.set('volume', filter);
  }

  public setEqualizer(bands: IEqualizerBand[]): void {
    if (!Array.isArray(bands)) {
      throw new FilterInvalidArgument('Equalizer bands must be an array');
    }

    for (const band of bands) {
      if (band.band < 0 || band.band > 14) {
        throw new FilterInvalidArgument('Equalizer band must be between 0 and 14');
      }
      if (band.gain < -0.25 || band.gain > 1.0) {
        throw new FilterInvalidArgument('Equalizer gain must be between -0.25 and 1.0');
      }
    }

    const filter = new Filter('equalizer', FilterType.EQUALIZER, bands);
    this._filters.set('equalizer', filter);
  }

  public setKaraoke(options: IKaraokeFilter): void {
    const filter = new Filter('karaoke', FilterType.KARAOKE, options);
    this._filters.set('karaoke', filter);
  }

  public setTimescale(options: ITimescaleFilter): void {
    if (options.speed && (options.speed <= 0 || options.speed > 5)) {
      throw new FilterInvalidArgument('Timescale speed must be between 0 and 5');
    }
    if (options.pitch && (options.pitch <= 0 || options.pitch > 5)) {
      throw new FilterInvalidArgument('Timescale pitch must be between 0 and 5');
    }
    if (options.rate && (options.rate <= 0 || options.rate > 5)) {
      throw new FilterInvalidArgument('Timescale rate must be between 0 and 5');
    }

    const filter = new Filter('timescale', FilterType.TIMESCALE, options);
    this._filters.set('timescale', filter);
  }

  public setTremolo(options: ITremoloFilter): void {
    if (options.frequency && options.frequency <= 0) {
      throw new FilterInvalidArgument('Tremolo frequency must be greater than 0');
    }
    if (options.depth && (options.depth <= 0 || options.depth > 1)) {
      throw new FilterInvalidArgument('Tremolo depth must be between 0 and 1');
    }

    const filter = new Filter('tremolo', FilterType.TREMOLO, options);
    this._filters.set('tremolo', filter);
  }

  public setVibrato(options: IVibratoFilter): void {
    if (options.frequency && (options.frequency <= 0 || options.frequency > 14)) {
      throw new FilterInvalidArgument('Vibrato frequency must be between 0 and 14');
    }
    if (options.depth && (options.depth <= 0 || options.depth > 1)) {
      throw new FilterInvalidArgument('Vibrato depth must be between 0 and 1');
    }

    const filter = new Filter('vibrato', FilterType.VIBRATO, options);
    this._filters.set('vibrato', filter);
  }

  public setRotation(options: IRotationFilter): void {
    const filter = new Filter('rotation', FilterType.ROTATION, options);
    this._filters.set('rotation', filter);
  }

  public setDistortion(options: IDistortionFilter): void {
    const filter = new Filter('distortion', FilterType.DISTORTION, options);
    this._filters.set('distortion', filter);
  }

  public setChannelMix(options: IChannelMixFilter): void {
    const filter = new Filter('channelMix', FilterType.CHANNEL_MIX, options);
    this._filters.set('channelMix', filter);
  }

  public setLowPass(options: ILowPassFilter): void {
    if (options.smoothing && options.smoothing <= 0) {
      throw new FilterInvalidArgument('Low pass smoothing must be greater than 0');
    }

    const filter = new Filter('lowPass', FilterType.LOW_PASS, options);
    this._filters.set('lowPass', filter);
  }

  public toJSON(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const filter of this._filters.values()) {
      Object.assign(result, filter.toJSON());
    }
    
    return result;
  }

  public get count(): number {
    return this._filters.size;
  }

  public get isEmpty(): boolean {
    return this._filters.size === 0;
  }

  public getAll(): Filter[] {
    return Array.from(this._filters.values());
  }

  // Preset filters
  public static createBassBoost(level: number = 1): Filters {
    const filters = new Filters();
    const bands: IEqualizerBand[] = [
      { band: 0, gain: level * 0.2 },
      { band: 1, gain: level * 0.15 },
      { band: 2, gain: level * 0.1 },
      { band: 3, gain: level * 0.05 },
    ];
    filters.setEqualizer(bands);
    return filters;
  }

  public static createTrebleBoost(level: number = 1): Filters {
    const filters = new Filters();
    const bands: IEqualizerBand[] = [
      { band: 10, gain: level * 0.05 },
      { band: 11, gain: level * 0.1 },
      { band: 12, gain: level * 0.15 },
      { band: 13, gain: level * 0.2 },
      { band: 14, gain: level * 0.25 },
    ];
    filters.setEqualizer(bands);
    return filters;
  }

  public static createNightcore(speed: number = 1.2, pitch: number = 1.2): Filters {
    const filters = new Filters();
    filters.setTimescale({ speed, pitch });
    return filters;
  }

  public static createVaporwave(speed: number = 0.8, pitch: number = 0.8): Filters {
    const filters = new Filters();
    filters.setTimescale({ speed, pitch });
    return filters;
  }

  public static create8D(rotationHz: number = 0.2): Filters {
    const filters = new Filters();
    filters.setRotation({ rotationHz });
    return filters;
  }
}
