/**
 * MIT License
 *
 * Copyright (c) 2025 NirrussVn0
 */
import 'module-alias/register';
import 'reflect-metadata';
import { SabiCordMusicClient } from './core/RefactoredMusicClient';
const nodeProcess = eval('process');
const nodeConsole = eval('console');
async function main(): Promise<void> {
  try {
    nodeConsole.log('Starting SabiCord Discord Music Bot...');
    const client = new SabiCordMusicClient();
    await client.start();
  } catch (error) {
    nodeConsole.error('Failed to start bot:', error);
    nodeProcess.exit(1);
  }
}
main().catch((error) => {
  nodeConsole.error('Fatal error:', error);
  nodeProcess.exit(1);
});
