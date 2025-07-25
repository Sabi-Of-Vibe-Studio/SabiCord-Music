/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../core/Logger';
import { dirname } from "@discordx/importer";
export interface ITranslationData {
  [key: string]: string | ITranslationData;
}
export interface IPlaceholderData {
  [key: string]: string | number | boolean;
}
export class Translator {
  private static instance: Translator;
  private translations = new Map<string, ITranslationData>();
  private defaultLanguage = 'EN';
  private availableLanguages: string[] = [];
  private constructor() {
    this.loadTranslations();
  }
  public static getInstance(): Translator {
    if (!Translator.instance) {
      Translator.instance = new Translator();
    }
    return Translator.instance;
  }
  private loadTranslations(): void {
    const langsPath = join(dirname(import.meta.url), 'langs');
    if (!existsSync(langsPath)) {
      logger.warn('Languages directory not found, creating default translations', 'translator');
      this.createDefaultTranslations();
      return;
    }
    try {
      const files = readdirSync(langsPath).filter(file => file.endsWith('.json'));
      for (const file of files) {
        const langCode = file.replace('.json', '').toUpperCase();
        const filePath = join(langsPath, file);
        try {
          const content = readFileSync(filePath, 'utf8');
          const translations = JSON.parse(content);
          this.translations.set(langCode, translations);
          this.availableLanguages.push(langCode);
          logger.debug(`Loaded translations for ${langCode}`, 'translator');
        } catch (error) {
          logger.error(`Failed to load translations for ${langCode}`, error as Error, 'translator');
        }
      }
      if (this.availableLanguages.length === 0) {
        this.createDefaultTranslations();
      }
      logger.info(`Loaded ${this.availableLanguages.length} language(s): ${this.availableLanguages.join(', ')}`, 'translator');
    } catch (error) {
      logger.error('Failed to load translations', error as Error, 'translator');
      this.createDefaultTranslations();
    }
  }
  private createDefaultTranslations(): void {
    const defaultTranslations: ITranslationData = {
      commands: {
        music: {
          play: {
            no_tracks: 'No tracks found for your query!',
            track_added: 'Track added to queue: **{title}**',
            playlist_added: 'Added **{count}** tracks from playlist **{name}**',
            now_playing: 'Now playing: **{title}**',
          },
          pause: {
            paused: 'Music paused!',
            already_paused: 'Music is already paused!',
            vote_registered: 'Vote to pause registered! ({votes}/{required})',
          },
          resume: {
            resumed: 'Music resumed!',
            not_paused: 'Music is not paused!',
            vote_registered: 'Vote to resume registered! ({votes}/{required})',
          },
          skip: {
            skipped: 'Skipped: **{title}**',
            no_track: 'No track is currently playing!',
            vote_registered: 'Vote to skip registered! ({votes}/{required})',
          },
          stop: {
            stopped: 'Music stopped and queue cleared!',
            vote_registered: 'Vote to stop registered! ({votes}/{required})',
          },
          volume: {
            set: 'Volume set to **{volume}%**!',
            invalid: 'Volume must be between 0 and 100!',
          },
        },
        queue: {
          list: {
            empty: 'The queue is empty!',
            page_info: 'Page {page}/{total} • {count} tracks • {duration} total',
          },
          shuffle: {
            shuffled: 'Queue shuffled!',
            empty: 'The queue is empty!',
            vote_registered: 'Vote to shuffle registered! ({votes}/{required})',
          },
          clear: {
            cleared: 'Cleared **{count}** tracks from the queue!',
          },
          remove: {
            removed: 'Removed **{title}** from the queue!',
            removed_multiple: 'Removed **{count}** tracks from the queue!',
            invalid_position: 'Invalid position! Please check the queue and try again.',
            no_permission: 'You can only remove tracks you requested!',
          },
          repeat: {
            set: 'Repeat mode set to **{mode}**!',
            changed: 'Repeat mode changed from **{old}** to **{new}**!',
          },
        },
        effects: {
          applied: '{effect} effect applied!',
          cleared: 'All audio effects cleared!',
          failed: 'Failed to apply {effect} effect!',
          status: {
            none: 'No audio effects are currently active.',
            active: '{count} effect(s) active',
          },
        },
        settings: {
          prefix: {
            current: 'Current prefix: `{prefix}`',
            updated: 'Prefix updated to: `{prefix}`',
          },
          language: {
            current: 'Current language: **{language}**',
            updated: 'Language updated to: **{language}**',
          },
          music_channel: {
            set: 'Music request channel set to {channel}!',
            removed: 'Music request channel removed!',
          },
          controller: {
            enabled: 'Controller messages enabled!',
            disabled: 'Controller messages disabled!',
          },
        },
      },
      errors: {
        no_permission: 'You don\'t have permission to use this command!',
        not_in_voice: 'You must be in a voice channel to use this command!',
        not_same_voice: 'You must be in {channel} to use this command!',
        no_player: 'No music player is active!',
        no_track: 'No track is currently playing!',
        dj_only: 'You need DJ permissions to use this command!',
        bot_permissions: 'I need {permissions} permissions in that voice channel!',
        command_error: 'An error occurred while executing the command!',
        invalid_url: 'Invalid URL provided!',
        track_load_failed: 'Failed to load track!',
        player_error: 'An error occurred with the music player!',
      },
      general: {
        yes: 'Yes',
        no: 'No',
        enabled: 'Enabled',
        disabled: 'Disabled',
        unknown: 'Unknown',
        none: 'None',
        loading: 'Loading...',
        success: 'Success!',
        error: 'Error!',
        cancelled: 'Cancelled',
        timeout: 'Timed out',
      },
      time: {
        seconds: 'seconds',
        minutes: 'minutes',
        hours: 'hours',
        days: 'days',
        weeks: 'weeks',
        months: 'months',
        years: 'years',
      },
    };
    this.translations.set(this.defaultLanguage, defaultTranslations);
    this.availableLanguages.push(this.defaultLanguage);
    logger.info('Created default English translations', 'translator');
  }
  public translate(key: string, language?: string, placeholders?: IPlaceholderData): string {
    const lang = language?.toUpperCase() || this.defaultLanguage;
    const translations = this.translations.get(lang) || this.translations.get(this.defaultLanguage);
    if (!translations) {
      logger.warn(`No translations found for language ${lang}`, 'translator');
      return key;
    }
    const value = this.getNestedValue(translations, key);
    if (typeof value !== 'string') {
      logger.warn(`Translation key '${key}' not found for language ${lang}`, 'translator');
      return key;
    }
    return this.replacePlaceholders(value, placeholders);
  }
  private getNestedValue(obj: ITranslationData, path: string): any {
    const keys = path.split('.');
    let current: any = obj;
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    return current;
  }
  private replacePlaceholders(text: string, placeholders?: IPlaceholderData): string {
    if (!placeholders) return text;
    let result = text;
    for (const [key, value] of Object.entries(placeholders)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    return result;
  }
  public getAvailableLanguages(): string[] {
    return [...this.availableLanguages];
  }
  public isLanguageAvailable(language: string): boolean {
    return this.availableLanguages.includes(language.toUpperCase());
  }
  public setDefaultLanguage(language: string): void {
    if (this.isLanguageAvailable(language)) {
      this.defaultLanguage = language.toUpperCase();
      logger.info(`Default language set to ${this.defaultLanguage}`, 'translator');
    } else {
      logger.warn(`Language ${language} is not available`, 'translator');
    }
  }
  public getDefaultLanguage(): string {
    return this.defaultLanguage;
  }
  public reloadTranslations(): void {
    this.translations.clear();
    this.availableLanguages = [];
    this.loadTranslations();
    logger.info('Translations reloaded', 'translator');
  }
}
export const translator = Translator.getInstance();
export function t(key: string, language?: string, placeholders?: IPlaceholderData): string {
  return translator.translate(key, language, placeholders);
}
