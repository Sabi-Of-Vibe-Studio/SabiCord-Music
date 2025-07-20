/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import { FilterType } from './Enums';
import { InvalidFilterValue } from './Exceptions';
export interface IEqualizerBand {
  band: number;
  gain: number;
}
export interface IKaraokeSettings {
  level?: number;
  monoLevel?: number;
  filterBand?: number;
  filterWidth?: number;
}
export interface ITimescaleSettings {
  speed?: number;
  pitch?: number;
  rate?: number;
}
export interface ITremoloSettings {
  frequency?: number;
  depth?: number;
}
export interface IVibratoSettings {
  frequency?: number;
  depth?: number;
}
export interface IRotationSettings {
  rotationHz?: number;
}
export interface IDistortionSettings {
  sinOffset?: number;
  sinScale?: number;
  cosOffset?: number;
  cosScale?: number;
  tanOffset?: number;
  tanScale?: number;
  offset?: number;
  scale?: number;
}
export interface IChannelMixSettings {
  leftToLeft?: number;
  leftToRight?: number;
  rightToLeft?: number;
  rightToRight?: number;
}
export interface ILowPassSettings {
  smoothing?: number;
}
export class Filters {
  private volume = 1.0;
  private equalizer: IEqualizerBand[] = [];
  private karaoke: IKaraokeSettings | undefined;
  private timescale: ITimescaleSettings | undefined;
  private tremolo: ITremoloSettings | undefined;
  private vibrato: IVibratoSettings | undefined;
  private rotation: IRotationSettings | undefined;
  private distortion: IDistortionSettings | undefined;
  private channelMix: IChannelMixSettings | undefined;
  private lowPass: ILowPassSettings | undefined;
  public setVolume(volume: number): this {
    if (volume < 0 || volume > 5) {
      throw new InvalidFilterValue('Volume must be between 0 and 5');
    }
    this.volume = volume;
    return this;
  }
  public getVolume(): number {
    return this.volume;
  }
  public setEqualizer(bands: IEqualizerBand[]): this {
    this.validateEqualizerBands(bands);
    this.equalizer = [...bands];
    return this;
  }
  public getEqualizer(): IEqualizerBand[] {
    return [...this.equalizer];
  }
  public setKaraoke(settings: IKaraokeSettings): this {
    this.validateKaraokeSettings(settings);
    this.karaoke = { ...settings };
    return this;
  }
  public setTimescale(settings: ITimescaleSettings): this {
    this.validateTimescaleSettings(settings);
    this.timescale = { ...settings };
    return this;
  }
  public setTremolo(settings: ITremoloSettings): this {
    this.validateTremoloSettings(settings);
    this.tremolo = { ...settings };
    return this;
  }
  public setVibrato(settings: IVibratoSettings): this {
    this.validateVibratoSettings(settings);
    this.vibrato = { ...settings };
    return this;
  }
  public setRotation(settings: IRotationSettings): this {
    this.validateRotationSettings(settings);
    this.rotation = { ...settings };
    return this;
  }
  public setDistortion(settings: IDistortionSettings): this {
    this.distortion = { ...settings };
    return this;
  }
  public setChannelMix(settings: IChannelMixSettings): this {
    this.validateChannelMixSettings(settings);
    this.channelMix = { ...settings };
    return this;
  }
  public setLowPass(settings: ILowPassSettings): this {
    this.validateLowPassSettings(settings);
    this.lowPass = { ...settings };
    return this;
  }
  public clearFilter(type: FilterType): this {
    switch (type) {
      case FilterType.VOLUME:
        this.volume = 1.0;
        break;
      case FilterType.EQUALIZER:
        this.equalizer = [];
        break;
      case FilterType.KARAOKE:
        this.karaoke = undefined;
        break;
      case FilterType.TIMESCALE:
        this.timescale = undefined;
        break;
      case FilterType.TREMOLO:
        this.tremolo = undefined;
        break;
      case FilterType.VIBRATO:
        this.vibrato = undefined;
        break;
      case FilterType.ROTATION:
        this.rotation = undefined;
        break;
      case FilterType.DISTORTION:
        this.distortion = undefined;
        break;
      case FilterType.CHANNEL_MIX:
        this.channelMix = undefined;
        break;
      case FilterType.LOW_PASS:
        this.lowPass = undefined;
        break;
    }
    return this;
  }
  public clearAll(): this {
    this.volume = 1.0;
    this.equalizer = [];
    this.karaoke = undefined;
    this.timescale = undefined;
    this.tremolo = undefined;
    this.vibrato = undefined;
    this.rotation = undefined;
    this.distortion = undefined;
    this.channelMix = undefined;
    this.lowPass = undefined;
    return this;
  }
  public getAll(): any {
    return this.toJSON();
  }
  public get filters(): any {
    return this.toJSON();
  }
  public toJSON(): any {
    const filters: any = {};
    if (this.volume !== 1.0) {
      filters.volume = this.volume;
    }
    if (this.equalizer.length > 0) {
      filters.equalizer = this.equalizer;
    }
    if (this.karaoke) {
      filters.karaoke = this.karaoke;
    }
    if (this.timescale) {
      filters.timescale = this.timescale;
    }
    if (this.tremolo) {
      filters.tremolo = this.tremolo;
    }
    if (this.vibrato) {
      filters.vibrato = this.vibrato;
    }
    if (this.rotation) {
      filters.rotation = this.rotation;
    }
    if (this.distortion) {
      filters.distortion = this.distortion;
    }
    if (this.channelMix) {
      filters.channelMix = this.channelMix;
    }
    if (this.lowPass) {
      filters.lowPass = this.lowPass;
    }
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
  public static create8D(speed: number = 1.0): Filters {
    const filters = new Filters();
    filters.setRotation({ rotationHz: 0.2 });
    if (speed !== 1.0) {
      filters.setTimescale({ speed });
    }
    return filters;
  }
  private validateEqualizerBands(bands: IEqualizerBand[]): void {
    for (const band of bands) {
      if (band.band < 0 || band.band > 14) {
        throw new InvalidFilterValue('Equalizer band must be between 0 and 14');
      }
      if (band.gain < -0.25 || band.gain > 1.0) {
        throw new InvalidFilterValue('Equalizer gain must be between -0.25 and 1.0');
      }
    }
  }
  private validateKaraokeSettings(settings: IKaraokeSettings): void {
    if (settings.level !== undefined && (settings.level < 0 || settings.level > 1)) {
      throw new InvalidFilterValue('Karaoke level must be between 0 and 1');
    }
  }
  private validateTimescaleSettings(settings: ITimescaleSettings): void {
    if (settings.speed !== undefined && (settings.speed < 0.1 || settings.speed > 5)) {
      throw new InvalidFilterValue('Timescale speed must be between 0.1 and 5');
    }
    if (settings.pitch !== undefined && (settings.pitch < 0.1 || settings.pitch > 5)) {
      throw new InvalidFilterValue('Timescale pitch must be between 0.1 and 5');
    }
  }
  private validateTremoloSettings(settings: ITremoloSettings): void {
    if (settings.frequency !== undefined && settings.frequency < 0) {
      throw new InvalidFilterValue('Tremolo frequency must be positive');
    }
    if (settings.depth !== undefined && (settings.depth < 0 || settings.depth > 1)) {
      throw new InvalidFilterValue('Tremolo depth must be between 0 and 1');
    }
  }
  private validateVibratoSettings(settings: IVibratoSettings): void {
    if (settings.frequency !== undefined && settings.frequency < 0) {
      throw new InvalidFilterValue('Vibrato frequency must be positive');
    }
    if (settings.depth !== undefined && (settings.depth < 0 || settings.depth > 1)) {
      throw new InvalidFilterValue('Vibrato depth must be between 0 and 1');
    }
  }
  private validateRotationSettings(settings: IRotationSettings): void {
    if (settings.rotationHz !== undefined && settings.rotationHz < 0) {
      throw new InvalidFilterValue('Rotation Hz must be positive');
    }
  }
  private validateChannelMixSettings(settings: IChannelMixSettings): void {
    const values = [settings.leftToLeft, settings.leftToRight, settings.rightToLeft, settings.rightToRight];
    for (const value of values) {
      if (value !== undefined && (value < 0 || value > 1)) {
        throw new InvalidFilterValue('Channel mix values must be between 0 and 1');
      }
    }
  }
  private validateLowPassSettings(settings: ILowPassSettings): void {
    if (settings.smoothing !== undefined && (settings.smoothing < 1 || settings.smoothing > 100)) {
      throw new InvalidFilterValue('Low pass smoothing must be between 1 and 100');
    }
  }
}
