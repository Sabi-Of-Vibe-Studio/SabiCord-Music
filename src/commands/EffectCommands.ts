/**
 * MIT License
 * 
 * Copyright (c) 2025 NirrussVn0
 */
import {
  CommandInteraction,
  ApplicationCommandOptionType
} from 'discord.js';
import { Discord, Slash, SlashOption, SlashGroup } from 'discordx';
import { injectable } from 'tsyringe';
import { getPlayer } from '../audio/index';
import { Filters } from '../audio/index';
import { logger } from '../core/Logger';
@Discord()
@SlashGroup({ description: 'Audio effect and filter commands', name: 'effects' })
@SlashGroup('effects')
@injectable()
export class EffectCommands {
  @Slash({ description: 'Apply bass boost effect' })
  async bassboost(
    interaction: CommandInteraction,
    @SlashOption({
      description: 'Bass boost level (1-5)',
      name: 'level',
      required: false,
      type: ApplicationCommandOptionType.Integer,
      minValue: 1,
      maxValue: 5,
    })
    level: number = 1
  ): Promise<void> {
    const player = getPlayer(interaction.guildId!);
    if (!player) {
      await interaction.reply({ content: '❌ No music player is active!', ephemeral: true });
      return;
    }
    if (!player.isUserInChannel(interaction.user)) {
      await interaction.reply({
        content: `❌ You must be in ${player.channel} to use this command!`,
        ephemeral: true,
      });
      return;
    }
    if (!player.isPrivileged(interaction.user)) {
      await interaction.reply({
        content: '❌ You need DJ permissions to apply effects!',
        ephemeral: true,
      });
      return;
    }
    try {
      const filters = new Filters();
      const bassBoostBands = this.createBassBoostEqualizer(level);
      filters.setEqualizer(bassBoostBands);
      await player.setFilters(filters);
      await interaction.reply({
        content: `🎵 Bass boost effect applied! (Level: ${level})`
      });
    } catch (error) {
      logger.error('Error applying bass boost', error as Error, 'commands');
      await interaction.reply({ 
        content: '❌ Failed to apply bass boost effect!', 
        ephemeral: true 
      });
    }
  }
  @Slash({ description: 'Apply nightcore effect' })
  async nightcore(
    interaction: CommandInteraction,
    @SlashOption({
      description: 'Speed multiplier (0.5-2.0)',
      name: 'speed',
      required: false,
      type: ApplicationCommandOptionType.Number,
      minValue: 0.5,
      maxValue: 2.0,
    })
    speed: number = 1.2,
    @SlashOption({
      description: 'Pitch multiplier (0.5-2.0)',
      name: 'pitch',
      required: false,
      type: ApplicationCommandOptionType.Number,
      minValue: 0.5,
      maxValue: 2.0,
    })
    pitch: number = 1.2
  ): Promise<void> {
    const player = getPlayer(interaction.guildId!);
    if (!player) {
      await interaction.reply({ content: '❌ No music player is active!', ephemeral: true });
      return;
    }
    if (!player.isUserInChannel(interaction.user)) {
      await interaction.reply({
        content: `❌ You must be in ${player.channel} to use this command!`,
        ephemeral: true,
      });
      return;
    }
    if (!player.isPrivileged(interaction.user)) {
      await interaction.reply({
        content: '❌ You need DJ permissions to apply effects!',
        ephemeral: true,
      });
      return;
    }
    try {
      const filters = Filters.createNightcore(speed, pitch);
      await player.setFilters(filters);
      await interaction.reply({ 
        content: `🎵 Nightcore effect applied! (Speed: ${speed}x, Pitch: ${pitch}x)` 
      });
    } catch (error) {
      logger.error('Error applying nightcore', error as Error, 'commands');
      await interaction.reply({ 
        content: '❌ Failed to apply nightcore effect!', 
        ephemeral: true 
      });
    }
  }
  @Slash({ description: 'Apply vaporwave effect' })
  async vaporwave(
    interaction: CommandInteraction,
    @SlashOption({
      description: 'Speed multiplier (0.5-1.0)',
      name: 'speed',
      required: false,
      type: ApplicationCommandOptionType.Number,
      minValue: 0.5,
      maxValue: 1.0,
    })
    speed: number = 0.8,
    @SlashOption({
      description: 'Pitch multiplier (0.5-1.0)',
      name: 'pitch',
      required: false,
      type: ApplicationCommandOptionType.Number,
      minValue: 0.5,
      maxValue: 1.0,
    })
    pitch: number = 0.8
  ): Promise<void> {
    const player = getPlayer(interaction.guildId!);
    if (!player) {
      await interaction.reply({ content: '❌ No music player is active!', ephemeral: true });
      return;
    }
    if (!player.isUserInChannel(interaction.user)) {
      await interaction.reply({
        content: `❌ You must be in ${player.channel} to use this command!`,
        ephemeral: true,
      });
      return;
    }
    if (!player.isPrivileged(interaction.user)) {
      await interaction.reply({
        content: '❌ You need DJ permissions to apply effects!',
        ephemeral: true,
      });
      return;
    }
    try {
      const filters = Filters.createVaporwave(speed, pitch);
      await player.setFilters(filters);
      await interaction.reply({ 
        content: `🎵 Vaporwave effect applied! (Speed: ${speed}x, Pitch: ${pitch}x)` 
      });
    } catch (error) {
      logger.error('Error applying vaporwave', error as Error, 'commands');
      await interaction.reply({ 
        content: '❌ Failed to apply vaporwave effect!', 
        ephemeral: true 
      });
    }
  }
  @Slash({ description: 'Apply 8D audio effect' })
  async eightd(
    interaction: CommandInteraction,
    @SlashOption({
      description: 'Rotation speed (0.1-1.0)',
      name: 'speed',
      required: false,
      type: ApplicationCommandOptionType.Number,
      minValue: 0.1,
      maxValue: 1.0,
    })
    speed: number = 0.2
  ): Promise<void> {
    const player = getPlayer(interaction.guildId!);
    if (!player) {
      await interaction.reply({ content: '❌ No music player is active!', ephemeral: true });
      return;
    }
    if (!player.isUserInChannel(interaction.user)) {
      await interaction.reply({
        content: `❌ You must be in ${player.channel} to use this command!`,
        ephemeral: true,
      });
      return;
    }
    if (!player.isPrivileged(interaction.user)) {
      await interaction.reply({
        content: '❌ You need DJ permissions to apply effects!',
        ephemeral: true,
      });
      return;
    }
    try {
      const filters = Filters.create8D(speed);
      await player.setFilters(filters);
      await interaction.reply({
        content: `🎵 8D audio effect applied! (Rotation speed: ${speed}Hz)`
      });
    } catch (error) {
      logger.error('Error applying 8D effect', error as Error, 'commands');
      await interaction.reply({ 
        content: '❌ Failed to apply 8D audio effect!', 
        ephemeral: true 
      });
    }
  }
  @Slash({ description: 'Apply karaoke effect (remove vocals)' })
  async karaoke(
    interaction: CommandInteraction,
    @SlashOption({
      description: 'Karaoke level (0.1-1.0)',
      name: 'level',
      required: false,
      type: ApplicationCommandOptionType.Number,
      minValue: 0.1,
      maxValue: 1.0,
    })
    level: number = 1.0
  ): Promise<void> {
    const player = getPlayer(interaction.guildId!);
    if (!player) {
      await interaction.reply({ content: '❌ No music player is active!', ephemeral: true });
      return;
    }
    if (!player.isUserInChannel(interaction.user)) {
      await interaction.reply({
        content: `❌ You must be in ${player.channel} to use this command!`,
        ephemeral: true,
      });
      return;
    }
    if (!player.isPrivileged(interaction.user)) {
      await interaction.reply({
        content: '❌ You need DJ permissions to apply effects!',
        ephemeral: true,
      });
      return;
    }
    try {
      const filters = new Filters();
      filters.setKaraoke({ level, monoLevel: 1.0, filterBand: 220.0, filterWidth: 100.0 });
      await player.setFilters(filters);
      await interaction.reply({ 
        content: `🎵 Karaoke effect applied! (Level: ${level})` 
      });
    } catch (error) {
      logger.error('Error applying karaoke effect', error as Error, 'commands');
      await interaction.reply({ 
        content: '❌ Failed to apply karaoke effect!', 
        ephemeral: true 
      });
    }
  }
  @Slash({ description: 'Apply tremolo effect' })
  async tremolo(
    interaction: CommandInteraction,
    @SlashOption({
      description: 'Tremolo frequency (0.1-20.0)',
      name: 'frequency',
      required: false,
      type: ApplicationCommandOptionType.Number,
      minValue: 0.1,
      maxValue: 20.0,
    })
    frequency: number = 2.0,
    @SlashOption({
      description: 'Tremolo depth (0.1-1.0)',
      name: 'depth',
      required: false,
      type: ApplicationCommandOptionType.Number,
      minValue: 0.1,
      maxValue: 1.0,
    })
    depth: number = 0.5
  ): Promise<void> {
    const player = getPlayer(interaction.guildId!);
    if (!player) {
      await interaction.reply({ content: '❌ No music player is active!', ephemeral: true });
      return;
    }
    if (!player.isUserInChannel(interaction.user)) {
      await interaction.reply({
        content: `❌ You must be in ${player.channel} to use this command!`,
        ephemeral: true,
      });
      return;
    }
    if (!player.isPrivileged(interaction.user)) {
      await interaction.reply({
        content: '❌ You need DJ permissions to apply effects!',
        ephemeral: true,
      });
      return;
    }
    try {
      const filters = new Filters();
      filters.setTremolo({ frequency, depth });
      await player.setFilters(filters);
      await interaction.reply({ 
        content: `🎵 Tremolo effect applied! (Frequency: ${frequency}Hz, Depth: ${depth})` 
      });
    } catch (error) {
      logger.error('Error applying tremolo effect', error as Error, 'commands');
      await interaction.reply({ 
        content: '❌ Failed to apply tremolo effect!', 
        ephemeral: true 
      });
    }
  }
  @Slash({ description: 'Clear all audio effects' })
  async clear(interaction: CommandInteraction): Promise<void> {
    const player = getPlayer(interaction.guildId!);
    if (!player) {
      await interaction.reply({ content: '❌ No music player is active!', ephemeral: true });
      return;
    }
    if (!player.isUserInChannel(interaction.user)) {
      await interaction.reply({
        content: `❌ You must be in ${player.channel} to use this command!`,
        ephemeral: true,
      });
      return;
    }
    if (!player.isPrivileged(interaction.user)) {
      await interaction.reply({
        content: '❌ You need DJ permissions to clear effects!',
        ephemeral: true,
      });
      return;
    }
    try {
      const filters = new Filters();
      await player.setFilters(filters);
      await interaction.reply({ content: '🎵 All audio effects cleared!' });
    } catch (error) {
      logger.error('Error clearing effects', error as Error, 'commands');
      await interaction.reply({ 
        content: '❌ Failed to clear audio effects!', 
        ephemeral: true 
      });
    }
  }
  @Slash({ description: 'Show current audio effects' })
  async status(interaction: CommandInteraction): Promise<void> {
    const player = getPlayer(interaction.guildId!);
    if (!player) {
      await interaction.reply({ content: '❌ No music player is active!', ephemeral: true });
      return;
    }
    await interaction.reply({
      content: '🎵 Audio effects status is currently not available. Use individual effect commands to apply filters.'
    });
  }
  private createBassBoostEqualizer(level: number): Array<{ band: number; gain: number }> {
    const bassBoostGains = [0.2, 0.15, 0.1, 0.05, 0.0, -0.05, -0.1, -0.1, -0.1, -0.1, -0.1, -0.1, -0.1, -0.1, -0.1];
    const multiplier = level * 0.25;
    return bassBoostGains.map((gain, index) => ({
      band: index,
      gain: gain * multiplier
    }));
  }
}
