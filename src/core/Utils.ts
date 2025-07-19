/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { User, Guild, CommandInteraction, Message } from 'discord.js';
import { logger } from './Logger';

export class Utils {
  /**
   * Format milliseconds to human readable time
   */
  static formatTime(millis: number): string {
    const seconds = Math.floor((millis / 1000) % 60);
    const minutes = Math.floor((millis / (1000 * 60)) % 60);
    const hours = Math.floor((millis / (1000 * 60 * 60)) % 24);
    const days = Math.floor(millis / (1000 * 60 * 60 * 24));

    if (days > 0) {
      return `${days} days, ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Parse time string to milliseconds
   */
  static parseTime(timeString: string): number {
    try {
      const parts = timeString.split(':').map(part => parseInt(part, 10));
      
      if (parts.length === 1) {
        // Seconds only
        return parts[0] * 1000;
      } else if (parts.length === 2) {
        // Minutes:Seconds
        return (parts[0] * 60 + parts[1]) * 1000;
      } else if (parts.length === 3) {
        // Hours:Minutes:Seconds
        return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
      }
      
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Truncate string to specified length
   */
  static truncateString(text: string, length = 40): string {
    return text.length > length ? text.substring(0, length - 3) + '...' : text;
  }

  /**
   * Format bytes to human readable format
   */
  static formatBytes(bytes: number, includeUnit = false): string {
    if (bytes <= 1_000_000_000) {
      const mb = bytes / (1024 ** 2);
      return `${mb.toFixed(1)}${includeUnit ? 'MB' : ''}`;
    } else {
      const gb = bytes / (1024 ** 3);
      return `${gb.toFixed(1)}${includeUnit ? 'GB' : ''}`;
    }
  }

  /**
   * Check if user is bot owner or has special access
   */
  static isPrivileged(user: User, accessUsers: string[]): boolean {
    return accessUsers.includes(user.id);
  }

  /**
   * Get source emoji and color from source name
   */
  static getSourceInfo(source: string, sourceSettings: Record<string, any>): { emoji: string; color: string } {
    const normalizedSource = source.toLowerCase().replace(/\s+/g, '');
    const sourceInfo = sourceSettings[normalizedSource] || sourceSettings.others || { emoji: '🔗', color: '0xb3b3b3' };
    return sourceInfo;
  }

  /**
   * Read JSON file safely
   */
  static readJsonFile<T>(filePath: string): T | null {
    try {
      if (!existsSync(filePath)) {
        return null;
      }
      const content = readFileSync(filePath, 'utf8');
      return JSON.parse(content) as T;
    } catch (error) {
      logger.error(`Failed to read JSON file: ${filePath}`, error as Error);
      return null;
    }
  }

  /**
   * Write JSON file safely
   */
  static writeJsonFile<T>(filePath: string, data: T): boolean {
    try {
      const content = JSON.stringify(data, null, 2);
      writeFileSync(filePath, content, 'utf8');
      return true;
    } catch (error) {
      logger.error(`Failed to write JSON file: ${filePath}`, error as Error);
      return false;
    }
  }

  /**
   * Update JSON file with new data
   */
  static updateJsonFile<T extends Record<string, any>>(filePath: string, newData: Partial<T>): boolean {
    try {
      const existingData = this.readJsonFile<T>(filePath) || {} as T;
      const updatedData = { ...existingData, ...newData };
      return this.writeJsonFile(filePath, updatedData);
    } catch (error) {
      logger.error(`Failed to update JSON file: ${filePath}`, error as Error);
      return false;
    }
  }

  /**
   * Check if string is a valid URL
   */
  static isValidUrl(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract URLs from text
   */
  static extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*(),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+/g;
    return text.match(urlRegex) || [];
  }

  /**
   * Get user mention string
   */
  static getUserMention(user: User): string {
    return `<@${user.id}>`;
  }

  /**
   * Get channel mention string
   */
  static getChannelMention(channelId: string): string {
    return `<#${channelId}>`;
  }

  /**
   * Calculate required votes for an action
   */
  static calculateRequiredVotes(memberCount: number): number {
    if (memberCount <= 2) return 1;
    if (memberCount <= 4) return 2;
    return Math.ceil(memberCount * 0.4);
  }

  /**
   * Sleep for specified milliseconds
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          throw lastError;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Chunk array into smaller arrays
   */
  static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Shuffle array in place
   */
  static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get random element from array
   */
  static getRandomElement<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Escape markdown characters
   */
  static escapeMarkdown(text: string): string {
    return text.replace(/[\\`*_{}[\]()~>#+\-=|.!]/g, '\\$&');
  }

  /**
   * Clean string for use in file names
   */
  static cleanFileName(fileName: string): string {
    return fileName.replace(/[<>:"/\\|?*]/g, '_').trim();
  }
}
