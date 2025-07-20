/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import { VoiceChannel, CommandInteraction, Message, User } from 'discord.js';
import { Player } from './Player';
import { NodePool } from './Node';
import { AudioException } from './Exceptions';
export * from './Enums';
export * from './Exceptions';
export * from './Track';
export * from './Queue';
export * from './Filters';
export * from './Node';
export * from './Player';
export const VERSION = '2.0.0';
export const AUTHOR = 'SabiCord Development';
export const LICENSE = 'MIT';
export async function connectChannel(
  interaction: CommandInteraction | Message,
  channel?: VoiceChannel
): Promise<Player> {
  const guild = interaction.guild;
  if (!guild) {
    throw new AudioException('Guild not found');
  }
  const member = guild.members.cache.get(interaction.member?.user?.id || '');
  if (!member?.voice?.channel && !channel) {
    throw new AudioException('User not in voice channel');
  }
  const voiceChannel = channel || member?.voice?.channel as VoiceChannel;
  if (!voiceChannel) {
    throw new AudioException('Voice channel not found');
  }
  const permissions = voiceChannel.permissionsFor(guild.members.me!);
  if (!permissions?.has(['Connect', 'Speak'])) {
    throw new AudioException('Missing voice channel permissions');
  }
  let player = NodePool.getPlayer(guild.id);
  if (!player) {
    player = new Player({
      guild,
      channel: voiceChannel,
    });
    await player.connect();
  }
  return player;
}
export function getPlayer(guildId: string): Player | null {
  return NodePool.getPlayer(guildId);
}
export function hasPlayer(guildId: string): boolean {
  return NodePool.hasPlayer(guildId);
}
export async function destroyPlayer(guildId: string): Promise<void> {
  const player = NodePool.getPlayer(guildId);
  if (player) {
    await player.destroy();
  }
}
export async function searchTracks(
  query: string,
  requester: User,
  source = 'ytsearch'
): Promise<any> {
  const node = NodePool.getNode();
  if (!node) {
    throw new AudioException('No available nodes');
  }
  const searchQuery = query.startsWith('http') ? query : `${source}:${query}`;
  try {
    const result = await node.search(searchQuery, requester);
    return result;
  } catch (error) {
    throw new AudioException(`Search failed: ${error}`);
  }
}
export async function initialize(client: any, nodeConfigs: any[]): Promise<void> {
  for (const config of nodeConfigs) {
    await NodePool.createNode(client, config);
  }
}
export async function shutdown(): Promise<void> {
  await NodePool.disconnectAll();
}
