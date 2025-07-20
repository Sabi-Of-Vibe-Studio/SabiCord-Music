/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

import { Settings } from '@core/Settings';
import { readFileSync, existsSync } from 'fs';

jest.mock('fs');
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

describe('Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    delete process.env.DISCORD_TOKEN;
    delete process.env.DISCORD_CLIENT_ID;
    delete process.env.MONGODB_URL;
    delete process.env.MONGODB_NAME;
  });

  afterEach(() => {

    process.env.DISCORD_TOKEN = 'test-token';
    process.env.DISCORD_CLIENT_ID = 'test-client-id';
    process.env.MONGODB_URL = 'mongodb://localhost:27017';
    process.env.MONGODB_NAME = 'vocard_test';
  });

  describe('constructor', () => {
    it('should load settings from environment variables', () => {
      process.env.DISCORD_TOKEN = 'env-token';
      process.env.DISCORD_CLIENT_ID = 'env-client-id';
      process.env.MONGODB_URL = 'mongodb://env:27017';
      process.env.MONGODB_NAME = 'env-db';
      process.env.BOT_PREFIX = '!';
      process.env.EMBED_COLOR = '0xff0000';

      mockExistsSync.mockReturnValue(false);

      const settings = new Settings();

      expect(settings.token).toBe('env-token');
      expect(settings.client_id).toBe('env-client-id');
      expect(settings.mongodb_url).toBe('mongodb://env:27017');
      expect(settings.mongodb_name).toBe('env-db');
      expect(settings.prefix).toBe('!');
      expect(settings.embed_color).toBe('0xff0000');
    });

    it('should load settings from JSON file when available', () => {
      const jsonSettings = {
        token: 'json-token',
        client_id: 'json-client-id',
        mongodb_url: 'mongodb://json:27017',
        mongodb_name: 'json-db',
        prefix: '$',
        embed_color: '0x00ff00',
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(jsonSettings));

      const settings = new Settings();

      expect(settings.token).toBe('json-token');
      expect(settings.client_id).toBe('json-client-id');
      expect(settings.mongodb_url).toBe('mongodb://json:27017');
      expect(settings.mongodb_name).toBe('json-db');
      expect(settings.prefix).toBe('$');
      expect(settings.embed_color).toBe('0x00ff00');
    });

    it('should prioritize JSON settings over environment variables', () => {
      process.env.DISCORD_TOKEN = 'env-token';
      process.env.BOT_PREFIX = '!';

      const jsonSettings = {
        token: 'json-token',
        prefix: '$',
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(jsonSettings));

      const settings = new Settings();

      expect(settings.token).toBe('json-token');
      expect(settings.prefix).toBe('$');
    });

    it('should throw error when required settings are missing', () => {
      mockExistsSync.mockReturnValue(false);

      expect(() => new Settings()).toThrow('Missing required configuration');
    });

    it('should handle malformed JSON gracefully', () => {
      process.env.DISCORD_TOKEN = 'env-token';
      process.env.DISCORD_CLIENT_ID = 'env-client-id';
      process.env.MONGODB_URL = 'mongodb://env:27017';
      process.env.MONGODB_NAME = 'env-db';

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('invalid json');

      const settings = new Settings();

      expect(settings.token).toBe('env-token');
      expect(settings.client_id).toBe('env-client-id');
    });

    it('should set default values for optional settings', () => {
      process.env.DISCORD_TOKEN = 'test-token';
      process.env.DISCORD_CLIENT_ID = 'test-client-id';
      process.env.MONGODB_URL = 'mongodb://test:27017';
      process.env.MONGODB_NAME = 'test-db';

      mockExistsSync.mockReturnValue(false);

      const settings = new Settings();

      expect(settings.prefix).toBe('?');
      expect(settings.embed_color).toBe('0xb3b3b3');
      expect(settings.default_max_queue).toBe(1000);
      expect(settings.lyrics_platform).toBe('lrclib');
      expect(settings.activity).toEqual([{ type: 'listening', name: '/help', status: 'online' }]);
    });
  });

  describe('getDefaultNodes', () => {
    it('should create default node configuration', () => {
      process.env.DISCORD_TOKEN = 'test-token';
      process.env.DISCORD_CLIENT_ID = 'test-client-id';
      process.env.MONGODB_URL = 'mongodb://test:27017';
      process.env.MONGODB_NAME = 'test-db';
      process.env.LAVALINK_HOST = 'custom-host';
      process.env.LAVALINK_PORT = '9999';
      process.env.LAVALINK_PASSWORD = 'custom-password';
      process.env.LAVALINK_SECURE = 'true';

      mockExistsSync.mockReturnValue(false);

      const settings = new Settings();

      expect(settings.nodes.DEFAULT).toEqual({
        host: 'custom-host',
        port: 9999,
        password: 'custom-password',
        secure: true,
        identifier: 'DEFAULT',
      });
    });
  });

  describe('getDefaultLogging', () => {
    it('should create default logging configuration', () => {
      process.env.DISCORD_TOKEN = 'test-token';
      process.env.DISCORD_CLIENT_ID = 'test-client-id';
      process.env.MONGODB_URL = 'mongodb://test:27017';
      process.env.MONGODB_NAME = 'test-db';
      process.env.LOG_FILE_PATH = './custom-logs';
      process.env.LOG_LEVEL = 'debug';
      process.env.LOG_MAX_HISTORY = '60';

      mockExistsSync.mockReturnValue(false);

      const settings = new Settings();

      expect(settings.logging).toEqual({
        file: {
          path: './custom-logs',
          enable: true,
        },
        level: {
          discord: 'debug',
          vocard: 'debug',
          ipc_client: 'debug',
        },
        'max-history': 60,
      });
    });
  });

  describe('getDefaultIPC', () => {
    it('should create default IPC configuration', () => {
      process.env.DISCORD_TOKEN = 'test-token';
      process.env.DISCORD_CLIENT_ID = 'test-client-id';
      process.env.MONGODB_URL = 'mongodb://test:27017';
      process.env.MONGODB_NAME = 'test-db';
      process.env.IPC_HOST = '0.0.0.0';
      process.env.IPC_PORT = '9000';
      process.env.IPC_PASSWORD = 'ipc-password';
      process.env.IPC_SECURE = 'true';
      process.env.IPC_ENABLE = 'true';

      mockExistsSync.mockReturnValue(false);

      const settings = new Settings();

      expect(settings.ipc_client).toEqual({
        host: '0.0.0.0',
        port: 9000,
        password: 'ipc-password',
        secure: true,
        enable: true,
      });
    });
  });

  describe('validate', () => {
    it('should not throw when all required settings are present', () => {
      process.env.DISCORD_TOKEN = 'test-token';
      process.env.DISCORD_CLIENT_ID = 'test-client-id';
      process.env.MONGODB_URL = 'mongodb://test:27017';
      process.env.MONGODB_NAME = 'test-db';

      mockExistsSync.mockReturnValue(false);

      const settings = new Settings();

      expect(() => settings.validate()).not.toThrow();
    });

    it('should throw when required settings are missing', () => {
      const jsonSettings = {
        token: '',
        client_id: 'test-client-id',
        mongodb_url: 'mongodb://test:27017',
        mongodb_name: 'test-db',
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(jsonSettings));

      const settings = new Settings();

      expect(() => settings.validate()).toThrow('Missing required settings: token');
    });
  });
});
