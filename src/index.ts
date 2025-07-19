/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 * 
 * Vocard - A modern TypeScript Discord music bot with Lavalink integration
 */

import { VocardClient } from '@core/Client';
import { logger } from '@core/Logger';

async function main(): Promise<void> {
  try {
    logger.info('Starting Vocard Discord Music Bot...', 'main');
    
    const client = new VocardClient();
    await client.start();
    
  } catch (error) {
    logger.error('Failed to start bot', error as Error, 'main');
    process.exit(1);
  }
}

// Start the bot
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
