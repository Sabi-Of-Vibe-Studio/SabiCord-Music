/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
declare const process: NodeJS.Process;
declare const console: Console;
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      DISCORD_TOKEN: string;
      DISCORD_CLIENT_ID: string;
      MONGODB_URL: string;
      MONGODB_NAME: string;
      LAVALINK_HOST?: string;
      LAVALINK_PORT?: string;
      LAVALINK_PASSWORD?: string;
      LAVALINK_SECURE?: string;
      BOT_PREFIX?: string;
      EMBED_COLOR?: string;
      MAX_QUEUE_SIZE?: string;
      LOG_LEVEL?: string;
      LOG_FILE_ENABLE?: string;
      LOG_FILE_PATH?: string;
      LOG_MAX_HISTORY?: string;
      IPC_HOST?: string;
      IPC_PORT?: string;
      IPC_PASSWORD?: string;
      IPC_SECURE?: string;
      IPC_ENABLE?: string;
    }
  }
}
export {};
