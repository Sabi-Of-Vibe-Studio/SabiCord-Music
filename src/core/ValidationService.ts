/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

export class ValidationError extends Error {
  public readonly field: string;
  public readonly value: any;

  constructor(message: string, field: string, value: any) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

export class ValidationService {
  public static validateDiscordToken(token: string): void {
    if (!token || token.trim() === '') {
      throw new ValidationError('Discord token is required', 'token', token);
    }

    if (token === '?' || token === 'YOUR_BOT_TOKEN') {
      throw new ValidationError('Discord token must be set to a valid bot token', 'token', token);
    }

    const tokenPattern = /^[A-Za-z0-9._-]+$/;
    if (!tokenPattern.test(token)) {
      throw new ValidationError('Discord token format is invalid', 'token', token);
    }
  }

  public static validateMongoUrl(url: string): void {
    if (!url || url.trim() === '') {
      throw new ValidationError('MongoDB URL is required', 'mongodb_url', url);
    }

    if (url === '?' || url === 'mongodb://localhost:27017') {
      throw new ValidationError('MongoDB URL must be configured', 'mongodb_url', url);
    }

    try {
      new URL(url);
    } catch {
      throw new ValidationError('MongoDB URL format is invalid', 'mongodb_url', url);
    }
  }

  public static validateVolume(volume: number): void {
    if (typeof volume !== 'number' || isNaN(volume)) {
      throw new ValidationError('Volume must be a number', 'volume', volume);
    }

    if (volume < 0 || volume > 200) {
      throw new ValidationError('Volume must be between 0 and 200', 'volume', volume);
    }
  }

  public static validateSeekPosition(position: number, trackLength: number): void {
    if (typeof position !== 'number' || isNaN(position)) {
      throw new ValidationError('Seek position must be a number', 'position', position);
    }

    if (position < 0) {
      throw new ValidationError('Seek position cannot be negative', 'position', position);
    }

    if (position > trackLength) {
      throw new ValidationError('Seek position cannot exceed track length', 'position', position);
    }
  }

  public static validateSearchQuery(query: string): void {
    if (!query || query.trim() === '') {
      throw new ValidationError('Search query cannot be empty', 'query', query);
    }

    if (query.length > 500) {
      throw new ValidationError('Search query is too long (max 500 characters)', 'query', query);
    }

    const forbiddenPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /<script/i,
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(query)) {
        throw new ValidationError('Search query contains forbidden content', 'query', query);
      }
    }
  }

  public static validateGuildId(guildId: string): void {
    if (!guildId || guildId.trim() === '') {
      throw new ValidationError('Guild ID is required', 'guildId', guildId);
    }

    const snowflakePattern = /^\d{17,19}$/;
    if (!snowflakePattern.test(guildId)) {
      throw new ValidationError('Guild ID format is invalid', 'guildId', guildId);
    }
  }

  public static validateUserId(userId: string): void {
    if (!userId || userId.trim() === '') {
      throw new ValidationError('User ID is required', 'userId', userId);
    }

    const snowflakePattern = /^\d{17,19}$/;
    if (!snowflakePattern.test(userId)) {
      throw new ValidationError('User ID format is invalid', 'userId', userId);
    }
  }

  public static validateChannelId(channelId: string): void {
    if (!channelId || channelId.trim() === '') {
      throw new ValidationError('Channel ID is required', 'channelId', channelId);
    }

    const snowflakePattern = /^\d{17,19}$/;
    if (!snowflakePattern.test(channelId)) {
      throw new ValidationError('Channel ID format is invalid', 'channelId', channelId);
    }
  }

  public static validateQueueIndex(index: number, queueSize: number): void {
    if (typeof index !== 'number' || isNaN(index)) {
      throw new ValidationError('Queue index must be a number', 'index', index);
    }

    if (index < 0) {
      throw new ValidationError('Queue index cannot be negative', 'index', index);
    }

    if (index >= queueSize) {
      throw new ValidationError('Queue index is out of bounds', 'index', index);
    }
  }

  public static validateEqualizerBand(band: number, gain: number): void {
    if (typeof band !== 'number' || isNaN(band)) {
      throw new ValidationError('Equalizer band must be a number', 'band', band);
    }

    if (band < 0 || band > 14) {
      throw new ValidationError('Equalizer band must be between 0 and 14', 'band', band);
    }

    if (typeof gain !== 'number' || isNaN(gain)) {
      throw new ValidationError('Equalizer gain must be a number', 'gain', gain);
    }

    if (gain < -0.25 || gain > 1.0) {
      throw new ValidationError('Equalizer gain must be between -0.25 and 1.0', 'gain', gain);
    }
  }

  public static validateTimescale(speed?: number, pitch?: number, rate?: number): void {
    if (speed !== undefined) {
      if (typeof speed !== 'number' || isNaN(speed)) {
        throw new ValidationError('Timescale speed must be a number', 'speed', speed);
      }
      if (speed < 0.1 || speed > 5.0) {
        throw new ValidationError('Timescale speed must be between 0.1 and 5.0', 'speed', speed);
      }
    }

    if (pitch !== undefined) {
      if (typeof pitch !== 'number' || isNaN(pitch)) {
        throw new ValidationError('Timescale pitch must be a number', 'pitch', pitch);
      }
      if (pitch < 0.1 || pitch > 5.0) {
        throw new ValidationError('Timescale pitch must be between 0.1 and 5.0', 'pitch', pitch);
      }
    }

    if (rate !== undefined) {
      if (typeof rate !== 'number' || isNaN(rate)) {
        throw new ValidationError('Timescale rate must be a number', 'rate', rate);
      }
      if (rate < 0.1 || rate > 5.0) {
        throw new ValidationError('Timescale rate must be between 0.1 and 5.0', 'rate', rate);
      }
    }
  }

  public static validateUrl(url: string): void {
    if (!url || url.trim() === '') {
      throw new ValidationError('URL cannot be empty', 'url', url);
    }

    try {
      const parsedUrl = new URL(url);
      
      const allowedProtocols = ['http:', 'https:'];
      if (!allowedProtocols.includes(parsedUrl.protocol)) {
        throw new ValidationError('URL must use HTTP or HTTPS protocol', 'url', url);
      }

      const blockedDomains = ['localhost', '127.0.0.1', '0.0.0.0'];
      if (blockedDomains.includes(parsedUrl.hostname)) {
        throw new ValidationError('URL domain is not allowed', 'url', url);
      }

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('URL format is invalid', 'url', url);
    }
  }

  public static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '')
      .substring(0, 2000);
  }

  public static isValidSnowflake(id: string): boolean {
    const snowflakePattern = /^\d{17,19}$/;
    return snowflakePattern.test(id);
  }

  public static isValidUrl(url: string): boolean {
    try {
      this.validateUrl(url);
      return true;
    } catch {
      return false;
    }
  }
}
