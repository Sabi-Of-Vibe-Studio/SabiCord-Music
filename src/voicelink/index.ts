/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */

import { VoiceChannel, CommandInteraction, Message, User } from 'discord.js';
import { Player, IPlayerOptions } from './Player';
import { NodePool } from './Node';
import { VoicelinkException } from './Exceptions';

// Re-export all classes and types
export * from './Enums';
export * from './Exceptions';
export * from './Track';
export * from './Queue';
export * from './Filters';
export * from './Node';
export * from './Player';

// Version info
export const VERSION = '2.0.0';
export const AUTHOR = 'Vocard Development';
export const LICENSE = 'MIT';

/**
 * Connect to a voice channel and create a player
 */
export async function connectChannel(
  context: CommandInteraction | Message,
  channel?: VoiceChannel,
  options: Partial<IPlayerOptions> = {}
): Promise<Player> {
  const guild = context.guild;
  if (!guild) {
    throw new VoicelinkException('This command can only be used in guilds');
  }

  // Determine the voice channel
  let voiceChannel: VoiceChannel;
  
  if (channel) {
    voiceChannel = channel;
  } else {
    const member = guild.members.cache.get(
      context instanceof Message ? context.author.id : context.user.id
    );
    
    if (!member?.voice.channel) {
      throw new VoicelinkException('You must be in a voice channel to use this command');
    }
    
    voiceChannel = member.voice.channel as VoiceChannel;
  }

  // Check permissions
  const permissions = voiceChannel.permissionsFor(guild.members.me!);
  if (!permissions?.has(['Connect', 'Speak'])) {
    throw new VoicelinkException('I need Connect and Speak permissions in that voice channel');
  }

  // Check if player already exists
  const existingPlayer = guild.voiceAdapterCreator ? 
    NodePool.getNode().players.get(guild.id) : null;
  
  if (existingPlayer) {
    return existingPlayer as Player;
  }

  // Create new player
  const player = new Player({
    guild,
    channel: voiceChannel,
    ...options,
  });

  await player.connect();
  return player;
}

/**
 * Get an existing player for a guild
 */
export function getPlayer(guildId: string): Player | null {
  try {
    const node = NodePool.getNode();
    return node.players.get(guildId) as Player || null;
  } catch {
    return null;
  }
}

/**
 * Check if a user is in the same voice channel as the bot
 */
export function isUserInVoiceChannel(user: User, guildId: string): boolean {
  const player = getPlayer(guildId);
  if (!player) return false;
  
  return player.isUserInChannel(user);
}

/**
 * Check if a user has privileged permissions (DJ role, manage channels, etc.)
 */
export function isUserPrivileged(user: User, guildId: string): boolean {
  const player = getPlayer(guildId);
  if (!player) return false;
  
  return player.isPrivileged(user);
}

/**
 * Initialize voicelink with nodes
 */
export async function initialize(client: any, nodeConfigs: any[]): Promise<void> {
  for (const config of nodeConfigs) {
    await NodePool.createNode(client, config);
  }
}

/**
 * Shutdown voicelink and disconnect all nodes
 */
export async function shutdown(): Promise<void> {
  await NodePool.disconnectAll();
}
