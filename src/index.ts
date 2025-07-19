/**
 * MIT License
 *
 * Copyright (c) 2025 NirrussVn0
 */

import 'reflect-metadata';
import { VocardClient } from '@core/Client';
import { logger } from '@core/Logger';

// Node.js globals - using dynamic imports to avoid TypeScript issues
const nodeProcess = eval('process');
const nodeConsole = eval('console');

async function main(): Promise<void> {
  try {
    logger.info('Starting Vocard Discord Music Bot...', 'main');
    
    const client = new VocardClient();
    await client.start();
    
  } catch (error) {
    logger.error('Failed to start bot', error as Error, 'main');
    nodeProcess.exit(1);
  }
}

// Start the bot
main().catch((error) => {
  nodeConsole.error('Fatal error:', error);
  nodeProcess.exit(1);
});
